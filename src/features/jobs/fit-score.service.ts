import { createSupabaseServerClient } from "@/core/supabase/server";
import { requireUserFromRequest } from "@/core/auth/require-user";
import { experienceScore, ExperienceRequirement } from "@/features/experience/experience.service";

type JobRequirement = {
  id: string;
  job_id: string;
  skill_id: string;
  required_level: number;
  importance: number;
  required_months_experience?: number | null;
  strictness?: "mandatory" | "preferred" | "nice_to_have" | null;
};
type SkillState = { skill_id: string; estimated_level: number; confidence: number; evidence_count: number; months_experience?: number | null };
type EducationLevel = "phd" | "master" | "bachelor" | "bootcamp" | "other" | null;

async function fetchJobRequirements(jobId: string, req?: Request) {
  const supabase = await createSupabaseServerClient(req);
  const { data, error } = await supabase
    .from("job_skill_requirements")
    .select("id,job_id,skill_id,required_level,importance,required_months_experience,strictness")
    .eq("job_id", jobId);
  if (error) throw new Error(error.message);
  return (data ?? []) as JobRequirement[];
}

async function fetchUserSkillState(userId: string, req?: Request) {
  const supabase = await createSupabaseServerClient(req);
  const { data, error } = await supabase
    .from("user_skill_state")
    .select("skill_id,estimated_level,confidence,evidence_count,months_experience")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []) as SkillState[];
}

async function fetchLatestEducation(userId: string, req?: Request): Promise<EducationLevel> {
  const supabase = await createSupabaseServerClient(req);
  const { data } = await supabase
    .from("cvs")
    .select("parsed_json")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  const level = (data as any)?.parsed_json?.education_level;
  return (level as EducationLevel) ?? null;
}

function computeSkillsMatch(reqs: JobRequirement[], state: SkillState[]) {
  if (!reqs.length) return { score: 0, gaps: [] as any[] };
  const stateMap = new Map(state.map((s) => [s.skill_id, s]));
  let totalWeight = 0;
  let weightedSum = 0;
  const gaps: any[] = [];

  for (const req of reqs) {
    const stateEntry = stateMap.get(req.skill_id);
    const userLevel = stateEntry?.estimated_level ?? 0;
    const gap = Math.max(0, req.required_level - userLevel);
    const perSkillScore = (10 - gap) / 10;
    let score = perSkillScore;
    const expReq: ExperienceRequirement = {
      skill_id: req.skill_id,
      required_months: Number(req.required_months_experience ?? 0),
      strictness: (req.strictness as any) ?? "preferred",
    };
    const expScore = experienceScore(Number(stateEntry?.months_experience ?? 0), expReq);
    score = score * 0.7 + expScore * 0.3;
    weightedSum += score * req.importance;
    totalWeight += req.importance;
    gaps.push({
      skill_id: req.skill_id,
      required_level: req.required_level,
      user_level: userLevel,
      gap,
      importance: req.importance,
      required_months_experience: req.required_months_experience ?? 0,
      user_months_experience: stateEntry?.months_experience ?? 0,
      exp_score: expScore,
      strictness: expReq.strictness,
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

function educationPenalty(job: any, education: EducationLevel) {
  const desc = `${job?.role_title ?? ""} ${job?.description_text ?? ""}`.toLowerCase();
  const needsMasters = desc.includes("master") || desc.includes("graduate degree");
  const needsPhd = desc.includes("phd") || desc.includes("doctorate");

  if (needsPhd && education !== "phd") return 0.5;
  if (needsMasters && education !== "master" && education !== "phd") return 0.7;
  return 1;
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
  const { data: job } = await supabase.from("jobs").select("id,role_title,description_text").eq("id", jobId).single();
  const { score: skills_match, gaps } = computeSkillsMatch(reqs, state);
  const cv_match = computeCvMatch(reqs, state);
  const portfolio_match = 50;
  const edu = await fetchLatestEducation(userId, req);
  const eduPenalty = educationPenalty(job, edu);
  const overall_fit = (0.45 * skills_match + 0.35 * cv_match + 0.2 * portfolio_match) * eduPenalty;

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

  const explanation_json = { top_gaps, top_wins, recommended_actions, education_penalty: eduPenalty, education_level: edu };

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

export async function recomputeFitScoresForJob(userId: string, jobId: string, req?: Request) {
  const reqs = await fetchJobRequirements(jobId, req);
  const state = await fetchUserSkillState(userId, req);
  await computeAndUpsertFitScore(userId, jobId, reqs, state, req);
}

export async function getJobFitDetail(userId: string, jobId: string, req?: Request) {
  const supabase = await createSupabaseServerClient(req);
  const { data: job, error: jobErr } = await supabase
    .from("jobs")
    .select("id,company,role_title,description_text,status,priority_weight,created_at")
    .eq("id", jobId)
    .single();
  if (jobErr || !job) throw new Error(jobErr?.message ?? "NOT_FOUND");

  const reqs = await fetchJobRequirements(jobId, req);
  const state = await fetchUserSkillState(userId, req);
  const { score: skills_match, gaps } = computeSkillsMatch(reqs, state);
  const cv_match = computeCvMatch(reqs, state);
  const portfolio_match = 50;
  const edu = await fetchLatestEducation(userId, req);
  const eduPenalty = educationPenalty(job, edu);
  const overall_fit = (0.45 * skills_match + 0.35 * cv_match + 0.2 * portfolio_match) * eduPenalty;

  const perSkill = reqs.map((r) => {
    const userLevel = state.find((s) => s.skill_id === r.skill_id)?.estimated_level ?? 0;
    const userMonths = state.find((s) => s.skill_id === r.skill_id)?.months_experience ?? 0;
    const gap = Math.max(0, r.required_level - userLevel);
    const levelMatch = (10 - gap) / 10;
    const expReq: ExperienceRequirement = {
      skill_id: r.skill_id,
      required_months: Number(r.required_months_experience ?? 0),
      strictness: (r.strictness as any) ?? "preferred",
    };
    const expScore = experienceScore(userMonths, expReq);
    const match = levelMatch * 0.7 + expScore * 0.3;
    return {
      ...r,
      user_level: userLevel,
      user_months_experience: userMonths,
      required_months_experience: r.required_months_experience ?? 0,
      strictness: r.strictness ?? "preferred",
      match,
      level_match: levelMatch,
      exp_score: expScore,
    };
  });

  return { job, skills_match, cv_match, portfolio_match, overall_fit, education_level: edu, edu_penalty: eduPenalty, perSkill };
}
