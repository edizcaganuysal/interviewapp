import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/core/config/env.public";

export async function createSupabaseServerClient(req?: Request) {
  const env = publicEnv();

  const auth = req?.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";

  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  });
}
