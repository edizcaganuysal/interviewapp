import { createSupabaseAdminClient } from "@/core/supabase/admin";
import { createSupabaseServerClient } from "@/core/supabase/server";
import type { Skill } from "./schemas";

export async function fetchSkillsServer(req?: Request): Promise<Skill[]> {
  const supabase = await createSupabaseServerClient(req);
  const { data, error } = await supabase.from("skills").select("id,category,name,aliases,parent_skill_id,created_by");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchSkillsByIds(ids: string[]) {
  if (!ids.length) return [];
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("skills")
    .select("id,category,name,aliases,parent_skill_id,created_by")
    .in("id", ids);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function searchSkills(term: string, limit = 10) {
  const supabase = createSupabaseAdminClient();
  const query = supabase
    .from("skills")
    .select("id,category,name,aliases,parent_skill_id,created_by")
    .order("name", { ascending: true })
    .limit(limit);

  const db = term ? query.ilike("name", `%${term}%`) : query;
  const { data, error } = await db;
  if (error) throw new Error(error.message);
  return data ?? [];
}
