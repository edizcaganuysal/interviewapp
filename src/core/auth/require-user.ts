import { SupabaseClient } from "@supabase/supabase-js";

export async function requireUserFromRequest(req: Request, supabase: SupabaseClient) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";

  if (!token) throw new Error("UNAUTHORIZED");

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) throw new Error("UNAUTHORIZED");

  return { user: data.user, token };
}
