import { AttemptInputSchema, type AttemptInput } from "./schemas";
import { insertAttempt } from "./attempts.repo";
import { applySkillUpdatesForAttempt } from "./skill-update.service";
import { recomputeFitScoresForSkills } from "../jobs/fit-score.service";

export async function submitAttempt(userId: string, raw: unknown, req?: Request) {
  const input: AttemptInput = AttemptInputSchema.parse(raw);
  const attemptId = await insertAttempt(userId, input, req);
  const { deltas, question } = await applySkillUpdatesForAttempt(userId, input, req);

  const impactedSkills = deltas.map((d) => d.skill_id);
  await recomputeFitScoresForSkills(userId, impactedSkills, req);

  return { attemptId, deltas, question };
}
