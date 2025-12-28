import { createSupabaseAdminClient } from "@/core/supabase/admin";
import type { QuestionInput } from "./schemas";

export async function listQuestions(params: { limit: number; offset: number }) {
  const supabase = createSupabaseAdminClient();

  const from = params.offset;
  const to = params.offset + params.limit - 1;

  const { data, error, count } = await supabase
    .from("questions")
    .select("id,title,difficulty_weight,estimated_minutes,is_mock,created_at,skill_ids", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  return {
    items: data ?? [],
    total: count ?? 0,
  };
}

export async function createQuestion(input: QuestionInput) {
  const supabase = createSupabaseAdminClient();

  const payload = {
    title: input.title,
    difficulty_weight: input.difficulty_weight,
    estimated_minutes: input.estimated_minutes,
    skill_ids: input.skill_ids,
    url: input.url ?? null,
    is_mock: input.is_mock ?? true,
  };

  const { data, error } = await supabase
    .from("questions")
    .insert(payload)
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateQuestion(id: string, input: Partial<QuestionInput>) {
  const supabase = createSupabaseAdminClient();

  const payload: any = {};
  if (typeof input.title === "string") payload.title = input.title;
  if (typeof input.difficulty_weight === "number") payload.difficulty_weight = input.difficulty_weight;
  if (typeof input.estimated_minutes === "number") payload.estimated_minutes = input.estimated_minutes;
  if (Array.isArray(input.skill_ids)) payload.skill_ids = input.skill_ids;
  if (input.url !== undefined) payload.url = input.url ?? null;
  if (typeof input.is_mock === "boolean") payload.is_mock = input.is_mock;

  const { error } = await supabase.from("questions").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteQuestion(id: string) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("questions").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
