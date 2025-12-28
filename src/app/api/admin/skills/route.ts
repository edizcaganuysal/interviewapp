import { NextResponse } from "next/server";
import { requireAdmin } from "@/core/auth/require-admin";
import { createSupabaseAdminClient } from "@/core/supabase/admin";

export async function GET(req: Request) {
  await requireAdmin();

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const limit = Math.min(20, Math.max(5, Number(url.searchParams.get("limit") ?? "10")));

  const supabase = createSupabaseAdminClient();

  if (!q) {
    const { data, error } = await supabase
      .from("skills")
      .select("id,name,category")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ items: data ?? [] });
  }

  const like = `%${q}%`;

  const { data, error } = await supabase
    .from("skills")
    .select("id,name,category")
    .or(`id.ilike.${like},name.ilike.${like}`)
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}
