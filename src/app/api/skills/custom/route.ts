import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/core/supabase/server";
import { createSupabaseAdminClient } from "@/core/supabase/admin";
import { requireUserFromRequest } from "@/core/auth/require-user";
import { slugify } from "@/core/utils/slug";
import { fetchSkillsServer } from "@/features/skills/skill.repo";
import { matchSkillsAgainstTaxonomy } from "@/features/skills/skill-matching.service";
import { upsertSkillState } from "@/features/skills/skill-state.service";

const InputSchema = z.object({
  skill_name: z.string().min(2),
  description: z.string().min(10),
  evidence: z.string().min(5),
  level: z.number().min(0).max(10).default(5),
  months_experience: z.number().min(0).max(600).default(0),
});

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient(req);
  let user;
  try {
    ({ user } = await requireUserFromRequest(req, supabase));
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json();
  let parsed;
  try {
    parsed = InputSchema.parse(body);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "INVALID" }, { status: 400 });
  }

  const skills = await fetchSkillsServer(req);
  const matched = matchSkillsAgainstTaxonomy([{ phrase: parsed.skill_name }], skills);
  const existing = matched.matches[0]?.skill_id;

  let skillId = existing;
  if (!skillId) {
    const id = `custom.${slugify(parsed.skill_name)}`;
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("skills").upsert({
      id,
      category: "LANGUAGE",
      name: parsed.skill_name,
      aliases: [],
      parent_skill_id: null,
      created_by: "user",
      created_at: new Date().toISOString(),
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    skillId = id;
  }

  await upsertSkillState(
    user.id,
    skillId,
    {
      setLevel: parsed.level,
      confidenceBoost: 0.15,
      evidenceIncrement: 1,
      monthsExperience: parsed.months_experience,
      reason: {
        source: "manual_claim",
        description: parsed.description,
        evidence: parsed.evidence,
      },
    },
    req
  );

  return NextResponse.json({ ok: true, skill_id: skillId });
}
