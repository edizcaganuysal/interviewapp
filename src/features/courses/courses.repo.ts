import { createSupabaseServerClient } from "@/core/supabase/server";

export async function fetchUserCourses(userId: string, req?: Request) {
  const supabase = await createSupabaseServerClient(req);
  const { data, error } = await supabase
    .from("courses")
    .select("id,code,name,term")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchUserCourseTags(userId: string, req?: Request) {
  const supabase = await createSupabaseServerClient(req);
  const { data: courses, error: courseErr } = await supabase
    .from("courses")
    .select("id")
    .eq("user_id", userId);
  if (courseErr) throw new Error(courseErr.message);
  const ids = (courses ?? []).map((c) => c.id);
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from("user_course_tags")
    .select("course_id,course_key")
    .in("course_id", ids);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchCourseSkillMappings(req?: Request) {
  const supabase = await createSupabaseServerClient(req);
  const { data, error } = await supabase
    .from("course_skill_mapping")
    .select("course_key,skill_id,weight");
  if (error) throw new Error(error.message);
  return data ?? [];
}
