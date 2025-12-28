import { createSupabaseServerClient } from "@/core/supabase/server";

export type Job = {
  id: string;
  company: string;
  role_title: string;
  description_text: string;
  status: string;
  priority_weight: number;
};

export async function fetchJobById(id: string, req?: Request) {
  const supabase = await createSupabaseServerClient(req);
  const { data, error } = await supabase
    .from("jobs")
    .select("id,company,role_title,description_text,status,priority_weight,created_at,user_id")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function listJobRequirements(jobId: string, req?: Request) {
  const supabase = await createSupabaseServerClient(req);
  const { data, error } = await supabase
    .from("job_skill_requirements")
    .select("id,skill_id,required_level,importance,required_months_experience,strictness")
    .eq("job_id", jobId)
    .order("importance", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function upsertJobRequirement(
  jobId: string,
  payload: { skill_id: string; required_level: number; importance: number; required_months_experience?: number; strictness?: string | null },
  req?: Request
) {
  const supabase = await createSupabaseServerClient(req);
  const { data, error } = await supabase
    .from("job_skill_requirements")
    .insert({ job_id: jobId, ...payload })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data?.id as string;
}

export async function updateJobRequirement(
  id: string,
  payload: Partial<{ required_level: number; importance: number; required_months_experience?: number; strictness?: string | null }>,
  req?: Request
) {
  const supabase = await createSupabaseServerClient(req);
  const { error } = await supabase.from("job_skill_requirements").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteJobRequirement(id: string, req?: Request) {
  const supabase = await createSupabaseServerClient(req);
  const { error } = await supabase.from("job_skill_requirements").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
