import { createSupabaseServerClient } from "@/core/supabase/server";
import { requireUserFromRequest } from "@/core/auth/require-user";

type JobRequirement = { id: string; job_id: string; skill_id: string; required_level: number; importance: number };
type SkillState = { skill_id: string; estimated_level: number; confidence: number; evidence_count: number };

async function fetchJobRequirements(jobId: string, req?: Request) {
  const supabase = await createSupabaseServerClient(req);
  const { data, error } = await supabase
    .from("job_skill_requirements")
    .select("id,job_id,skill_id,required_level,importance")
    .eq("job_id", jobId);
  if (error) throw new Error(error.message);
  return (data ?? []) as JobRequirement[];
}

async function fetchUserSkillState(userId: string, req?: Request) {
  const supabase = await createSupabaseServerClient(req);
  const { data, error } = await supabase
    .from("user_skill_state")
    .select("skill_id,estimated_level,confidence,evidence_count")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []) as SkillState[];
}

function computeSkillsMatch(reqs: JobRequirement[], state: SkillState[]) {
  if (!reqs.length) return { score: 0, gaps: [] as any[] };
  const stateMap = new Map(state.map((s) => [s.skill_id, s]));
  let totalWeight = 0;
  let weightedSum = 0;
  const gaps: any[] = [];

  for (const req of reqs) {
    const userLevel = stateMap.get(req.skill_id)?.estimated_level ?? 0;
    const gap = Math.max(0, req.required_level - userLevel);
    const perSkillScore = (10 - gap) / 10;
    weightedSum += perSkillScore * req.importance;
    totalWeight += req.importance;
    gaps.push({
      skill_id: req.skill_id,
      required_level: req.required_level,
      user_level: userLevel,
      gap,
      importance: req.importance,
    });
  }

  const score = totalWeight ? (100 * weightedSum) / totalWeight : 0;
  gaps.sort((a, b) => b.gap - a.gap);
  return { score, gaps };
}

function computeCvMatch(reqs: JobRequirement[], state: SkillState[]) {
  if (!reqs.length) return 0;
  const stateMap = new Map(state.map((s) => [s.skill_id, s]));
  let covered = 0;
  let total = 0;
  for (const req of reqs) {
    total += req.importance;
    const evidence = stateMap.get(req.skill_id)?.evidence_count ?? 0;
    if (evidence > 0) covered += req.importance;
  }
  return total ? (covered / total) * 100 : 0;
}

export async function recomputeFitScoresForSkills(userId: string, skillIds: string[], req?: Request) {
  const supabase = await createSupabaseServerClient(req);
  const { data: jobs, error } = await supabase
    .from("jobs")
    .select("id")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);

  const state = await fetchUserSkillState(userId, req);
  for (const job of jobs ?? []) {
    const reqs = await fetchJobRequirements(job.id, req);
    const usesSkill = skillIds.length === 0 || reqs.some((r) => skillIds.includes(r.skill_id));
    if (!usesSkill) continue;
    await computeAndUpsertFitScore(userId, job.id, reqs, state, req);
  }
}

async function computeAndUpsertFitScore(
  userId: string,
  jobId: string,
  reqs: JobRequirement[],
  state: SkillState[],
  req?: Request
) {
  const supabase = await createSupabaseServerClient(req);
  const { score: skills_match, gaps } = computeSkillsMatch(reqs, state);
  const cv_match = computeCvMatch(reqs, state);
  const portfolio_match = 50;
  const overall_fit = 0.45 * skills_match + 0.35 * cv_match + 0.2 * portfolio_match;

  const top_gaps = gaps.slice(0, 3);
  const top_wins = state
    .filter((s) => reqs.find((r) => r.skill_id === s.skill_id && s.evidence_count > 0))
    .slice(0, 3)
    .map((s) => ({ skill_id: s.skill_id, evidence_summary: `Evidence count: ${s.evidence_count}` }));

  const recommended_actions = top_gaps.map((g) => ({
    type: "mock_question",
    related_skill_ids: [g.skill_id],
    reason: "Close gap for target job",
    expected_gain_estimate: 5,
  }));

  const explanation_json = { top_gaps, top_wins, recommended_actions };

  await supabase.from("fit_scores").upsert(
    {
      user_id: userId,
      job_id: jobId,
      skills_match,
      cv_match,
      portfolio_match,
      overall_fit,
      explanation_json,
      calculated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,job_id" }
  );
}

export async function recomputeAllFitScores(req: Request) {
  const supabase = await createSupabaseServerClient(req);
  const { user } = await requireUserFromRequest(req, supabase);
  const { data: jobs, error } = await supabase
    .from("jobs")
    .select("id")
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);

  const state = await fetchUserSkillState(user.id, req);
  for (const job of jobs ?? []) {
    const reqs = await fetchJobRequirements(job.id, req);
    await computeAndUpsertFitScore(user.id, job.id, reqs, state, req);
  }
}
