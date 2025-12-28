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
    .from("jobs")
    .select("id,company,role_title,status,priority_weight,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient(req);

  let user;
  try {
    ({ user } = await requireUserFromRequest(req, supabase));
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json();

  const payload = {
    user_id: user.id,
    company: String(body?.company ?? "").trim(),
    role_title: String(body?.role_title ?? "").trim(),
    description_text: String(body?.description_text ?? "").trim(),
    status: String(body?.status ?? "saved"),
    priority_weight: Number(body?.priority_weight ?? 3),
  };

  if (!payload.company || !payload.role_title || !payload.description_text) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const { data, error } = await supabase.from("jobs").insert(payload).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, id: data.id });
}
