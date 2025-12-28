import { fetchQuestionById, fetchRecentAttemptsForSkill } from "./attempts.repo";
import type { AttemptInput } from "./schemas";
import { upsertSkillState } from "@/features/skills/skill-state.service";

type SkillDelta = { skill_id: string; delta: number };

function computeDelta(
  input: AttemptInput,
  difficultyWeight: number,
  estimatedMinutes: number,
  recent: number[]
): number {
  const base = input.solved ? 0.6 : -0.2;
  const difficultyAdj = (input.perceived_difficulty - difficultyWeight * 3) / 20;
  const timeAdj = input.time_spent_minutes > estimatedMinutes ? -0.05 : 0.05;
  const hintsAdj = -0.05 * input.hints_used;
  const confidenceAdj = (input.confidence_rating - 3) / 20;
  let delta = base + difficultyAdj + timeAdj + hintsAdj + confidenceAdj;

  // smoothing with recent updates
  if (recent.length) {
    const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
    delta = (delta + avgRecent) / 2;
  }

  return Math.max(-1, Math.min(1, delta));
}

export async function applySkillUpdatesForAttempt(userId: string, input: AttemptInput, req?: Request) {
  const question = await fetchQuestionById(input.question_id, req);
  const skillIds: string[] = Array.isArray(question.skill_ids) ? question.skill_ids : [];
  const deltas: SkillDelta[] = [];

  for (const skillId of skillIds) {
    const recent = await fetchRecentAttemptsForSkill(userId, skillId, 4, req);
    const recentDeltas = recent.map((r: any) => Number(r.delta) || 0);
    const delta = computeDelta(
      input,
      Number(question.difficulty_weight ?? 1),
      Number(question.estimated_minutes ?? 30),
      recentDeltas
    );
    deltas.push({ skill_id: skillId, delta });

    await upsertSkillState(userId, skillId, {
      delta,
      confidenceBoost: delta / 5,
      reason: {
        source: "attempt",
        solved: input.solved,
        perceived_difficulty: input.perceived_difficulty,
        question_difficulty: question.difficulty_weight,
        hints_used: input.hints_used,
      },
    }, req);
  }

  return { deltas, question };
}
