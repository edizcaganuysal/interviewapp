import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/core/supabase/server";
import { requireUserFromRequest } from "@/core/auth/require-user";

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient(req);
  let user;
  try {
    ({ user } = await requireUserFromRequest(req, supabase));
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("user_skill_state")
    .select("skill_id,estimated_level,confidence,evidence_count")
    .eq("user_id", user.id)
    .order("estimated_level", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ items: data ?? [] });
}
