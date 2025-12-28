import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/core/config/env.public";

export default function createSupabaseBrowserClient() {
  const env = publicEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
