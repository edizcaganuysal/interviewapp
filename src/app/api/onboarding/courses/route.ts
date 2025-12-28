import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/core/supabase/server";
import { requireUserFromRequest } from "@/core/auth/require-user";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient(req);
  let user;
  try {
    ({ user } = await requireUserFromRequest(req, supabase));
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json();
  const code = String(body?.code ?? "").trim();
  const name = String(body?.name ?? "").trim();
  const term = String(body?.term ?? "").trim();
  const course_key = String(body?.course_key ?? "").trim() || null;

  if (!code || !name) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  const { data, error } = await supabase
    .from("courses")
    .insert({
      user_id: user.id,
      code,
      name,
      term,
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (course_key) {
    await supabase.from("user_course_tags").insert({
      course_id: data.id,
      course_key,
    });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
