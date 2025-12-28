import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/core/supabase/server";
import { requireUserFromRequest } from "@/core/auth/require-user";
import { getJobFitDetail, recomputeFitScoresForJob } from "@/features/jobs/fit-score.service";
import { parseJobDescription } from "@/features/ai/ai.service";
import { fetchSkillsServer } from "@/features/skills/skill.repo";
import { matchSkillsAgainstTaxonomy } from "@/features/skills/skill-matching.service";

export async function GET(req: Request, ctx: { params: { id: string } }) {
  const supabase = await createSupabaseServerClient(req);
  let user;
  try {
    ({ user } = await requireUserFromRequest(req, supabase));
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const detail = await getJobFitDetail(user.id, ctx.params.id, req);
    return NextResponse.json({ item: detail.job, fit: detail });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "FAILED" }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const supabase = await createSupabaseServerClient(req);
  let user;
  try {
    ({ user } = await requireUserFromRequest(req, supabase));
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  const { data: job, error: jobErr } = await supabase
    .from("jobs")
    .select("id,user_id,company,role_title,description_text,status,priority_weight")
    .eq("id", ctx.params.id)
    .single();
  if (jobErr || !job || job.user_id !== user.id) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const updates = {
    company: String(body?.company ?? job.company),
    role_title: String(body?.role_title ?? job.role_title),
    description_text: String(body?.description_text ?? job.description_text),
    status: String(body?.status ?? job.status),
    priority_weight: Number(body?.priority_weight ?? job.priority_weight),
  };

  const { error: updErr } = await supabase.from("jobs").update(updates).eq("id", job.id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  try {
    const parsed = await parseJobDescription(updates.description_text);
    const skills = await fetchSkillsServer(req);
    const matches = matchSkillsAgainstTaxonomy(
      (parsed.requirements ?? []).map((r: any) => ({ phrase: r.skill_phrase })),
      skills
    );
    await supabase.from("job_skill_requirements").delete().eq("job_id", job.id);
    const toInsert: any[] = [];
    (parsed.requirements ?? []).forEach((reqItem: any, idx: number) => {
      const skillId =
        matches.matches[idx]?.skill_id ?? matches.matches.find((m) => m.phrase === reqItem.skill_phrase)?.skill_id;
      if (!skillId) return;
      toInsert.push({
        job_id: job.id,
        skill_id: skillId,
        required_level: Number(reqItem.required_level_0_10 ?? 5),
        importance: Number(reqItem.importance_1_5 ?? 3),
        required_months_experience: Number(reqItem.required_months_experience ?? 0),
        strictness: (reqItem.strictness as any) ?? "preferred",
      });
    });
    if (toInsert.length) await supabase.from("job_skill_requirements").insert(toInsert);
    await recomputeFitScoresForJob(user.id, job.id, req);
  } catch (err) {
    console.error("job re-parse failed", err);
  }

  return NextResponse.json({ ok: true });
}
