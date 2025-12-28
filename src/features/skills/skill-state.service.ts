import { createSupabaseServerClient } from "@/core/supabase/server";

type SkillEvidenceInput = {
  delta?: number;
  setLevel?: number;
  confidenceBoost?: number;
  evidenceIncrement?: number;
  monthsExperience?: number;
  reason: any;
};

export async function upsertSkillState(userId: string, skillId: string, update: SkillEvidenceInput, req?: Request) {
  const supabase = await createSupabaseServerClient(req);

  const { data: current } = await supabase
    .from("user_skill_state")
    .select("estimated_level,confidence,evidence_count,months_experience")
    .eq("user_id", userId)
    .eq("skill_id", skillId)
    .single();

  const delta = update.delta ?? 0;
  const setLevel = update.setLevel;
  const estimated_level = Math.min(
    10,
    Math.max(
      0,
      typeof setLevel === "number"
        ? setLevel
        : (current?.estimated_level ?? 0) + delta
    )
  );

  const confidenceBase = current?.confidence ?? 0.4;
  const confidence = Math.min(1, Math.max(0, confidenceBase + (update.confidenceBoost ?? delta / 10)));
  const evidence_count = (current?.evidence_count ?? 0) + (update.evidenceIncrement ?? 1);
  const months_experience = Math.max(0, (current?.months_experience ?? 0) + (update.monthsExperience ?? 0));

  await supabase
    .from("user_skill_state")
    .upsert({
      user_id: userId,
      skill_id: skillId,
      estimated_level,
      confidence,
      evidence_count,
      months_experience,
      last_updated: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("skill_id", skillId);

  await supabase.from("skill_update_log").insert({
    user_id: userId,
    skill_id: skillId,
    delta: update.delta ?? 0,
    reasons_json: update.reason,
  });

  return { estimated_level, confidence, evidence_count };
}
