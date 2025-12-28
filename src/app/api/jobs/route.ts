import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/core/supabase/server";
import { requireUserFromRequest } from "@/core/auth/require-user";
import { parseJobDescription } from "@/features/ai/ai.service";
import { fetchSkillsServer } from "@/features/skills/skill.repo";
import { matchSkillsAgainstTaxonomy } from "@/features/skills/skill-matching.service";
import { recomputeFitScoresForJob } from "@/features/jobs/fit-score.service";

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient(req);

  let user;
  try {
    ({ user } = await requireUserFromRequest(req, supabase));
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("jobs")
    .select("id,company,role_title,status,priority_weight,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient(req);

  let user;
  try {
    ({ user } = await requireUserFromRequest(req, supabase));
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json();

  const payload = {
    user_id: user.id,
    company: String(body?.company ?? "").trim(),
    role_title: String(body?.role_title ?? "").trim(),
    description_text: String(body?.description_text ?? "").trim(),
    status: String(body?.status ?? "saved"),
    priority_weight: Number(body?.priority_weight ?? 5),
  };

  if (!payload.company || !payload.role_title || !payload.description_text) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const { data, error } = await supabase.from("jobs").insert(payload).select("id,description_text").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    const parsed = await parseJobDescription(payload.description_text);
    const skills = await fetchSkillsServer(req);
    const matches = matchSkillsAgainstTaxonomy(
      (parsed.requirements ?? []).map((r: any) => ({ phrase: r.skill_phrase })),
      skills
    );
    await supabase.from("job_skill_requirements").delete().eq("job_id", data.id);
    const toInsert: any[] = [];
    (parsed.requirements ?? []).forEach((reqItem: any, idx: number) => {
      const skillId = matches.matches[idx]?.skill_id ?? matches.matches.find((m) => m.phrase === reqItem.skill_phrase)?.skill_id;
      if (!skillId) return;
      toInsert.push({
        job_id: data.id,
        skill_id: skillId,
        required_level: Number(reqItem.required_level_0_10 ?? 5),
        importance: Number(reqItem.importance_1_5 ?? 3),
        required_months_experience: Number(reqItem.required_months_experience ?? 0),
        strictness: (reqItem.strictness as any) ?? "preferred",
      });
    });
    if (toInsert.length) await supabase.from("job_skill_requirements").insert(toInsert);
    await recomputeFitScoresForJob(user.id, data.id, req);
  } catch (err) {
    console.error("job requirement extraction failed", err);
  }

  return NextResponse.json({ ok: true, id: data.id });
}
