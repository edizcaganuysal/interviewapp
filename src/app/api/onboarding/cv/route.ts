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
  const extracted_text = String(body?.text ?? "").trim();
  if (!extracted_text) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  const { error } = await supabase.from("cvs").insert({
    user_id: user.id,
    storage_path: null,
    extracted_text,
    parsed_json: {},
    created_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
