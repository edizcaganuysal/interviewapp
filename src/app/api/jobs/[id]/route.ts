import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/core/supabase/server";
import { requireUser } from "@/core/auth/require-user";

export async function GET(_: Request, ctx: { params: { id: string } }) {
  const supabase = await createSupabaseServerClient();
  const user = await requireUser(supabase);

  const { data, error } = await supabase
    .from("jobs")
    .select("id,company,role_title,description_text,status,priority_weight,created_at")
    .eq("id", ctx.params.id)
    .eq("user_id", user.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}
