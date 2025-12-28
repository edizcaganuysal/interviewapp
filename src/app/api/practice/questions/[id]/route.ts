import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/core/supabase/server";
import { requireUserFromRequest } from "@/core/auth/require-user";

export async function GET(req: Request, ctx: { params: { id: string } }) {
  const supabase = await createSupabaseServerClient(req);
  try {
    await requireUserFromRequest(req, supabase);
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("questions")
    .select("id,title,difficulty_weight,skill_ids,estimated_minutes,url")
    .eq("id", ctx.params.id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ item: data });
}
