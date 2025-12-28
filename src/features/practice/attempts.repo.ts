import { createSupabaseServerClient } from "@/core/supabase/server";
import type { AttemptInput } from "./schemas";

export async function insertAttempt(userId: string, input: AttemptInput, req?: Request) {
  const supabase = await createSupabaseServerClient(req);
  const payload = {
    user_id: userId,
    question_id: input.question_id,
    job_id: input.job_id ?? null,
    solved: input.solved,
    time_spent_minutes: input.time_spent_minutes,
    hints_used: input.hints_used,
    perceived_difficulty: input.perceived_difficulty,
    confidence_rating: input.confidence_rating,
    notes: input.notes ?? null,
    attempt_date: new Date().toISOString().slice(0, 10),
  };

  const { data, error } = await supabase.from("attempts").insert(payload).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function fetchQuestionById(id: string, req?: Request) {
  const supabase = await createSupabaseServerClient(req);
  const { data, error } = await supabase
    .from("questions")
    .select("id,title,difficulty_weight,skill_ids,estimated_minutes,url,is_mock")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchRecentAttemptsForSkill(userId: string, skillId: string, limit = 5, req?: Request) {
  const supabase = await createSupabaseServerClient(req);
  const { data, error } = await supabase
    .from("skill_update_log")
    .select("id,delta,created_at")
    .eq("user_id", userId)
    .eq("skill_id", skillId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}
