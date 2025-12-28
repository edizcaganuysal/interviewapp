import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/core/config/env.public";
import { serverEnv } from "@/core/config/env.server";

export function createSupabaseAdminClient() {
  const pub = publicEnv();
  const env = serverEnv();

  return createClient(pub.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
