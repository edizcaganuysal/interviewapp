import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/core/supabase/server";
import { requireUserFromRequest } from "@/core/auth/require-user";
import { parseJobDescription } from "@/features/ai/ai.service";
import { fetchSkillsServer } from "@/features/skills/skill.repo";
import { matchSkillsAgainstTaxonomy } from "@/features/skills/skill-matching.service";

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const supabase = await createSupabaseServerClient(req);
  let user;
  try {
    ({ user } = await requireUserFromRequest(req, supabase));
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { data: job, error: jobErr } = await supabase
    .from("jobs")
    .select("id,user_id,description_text")
    .eq("id", ctx.params.id)
    .single();
  if (jobErr || !job || job.user_id !== user.id) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  let parsed: any = null;
  try {
    parsed = await parseJobDescription(job.description_text);
  } catch {
    // fallback: no AI
    parsed = {
      requirements: [],
      proposed_new_skills: [],
    };
  }

  const skills = await fetchSkillsServer(req);
  const matches = matchSkillsAgainstTaxonomy(
    (parsed.requirements ?? []).map((r: any) => ({ phrase: r.skill_phrase })),
    skills
  );

  const toInsert: any[] = [];
  (parsed.requirements ?? []).forEach((reqItem: any, idx: number) => {
    const skillId = matches.matches[idx]?.skill_id ?? matches.matches.find((m) => m.phrase === reqItem.skill_phrase)?.skill_id;
    if (!skillId) return;
    const required = Number(reqItem.required_level_0_10 ?? 5);
    const importance = Number(reqItem.importance_1_5 ?? 3);
    const months = Number(reqItem.required_months_experience ?? 0);
    const strictness = (reqItem.strictness as any) ?? "preferred";
    toInsert.push({
      job_id: job.id,
      skill_id: skillId,
      required_level: required,
      importance,
      required_months_experience: months,
      strictness,
    });
  });

  if (toInsert.length) {
    await supabase.from("job_skill_requirements").insert(toInsert);
  }

  const idealLevels = toInsert.map((i) => ({ skill_id: i.skill_id, min: i.required_level, ideal: Math.min(10, i.required_level + 2) }));

  return NextResponse.json({ ok: true, created: toInsert.length, ideal_levels: idealLevels });
}
