import { NextResponse } from "next/server";
import { requireAdmin } from "@/core/auth/require-admin";
import { createSupabaseAdminClient } from "@/core/supabase/admin";
import { createQuestionUseCase } from "@/features/admin/questions.service";

export async function GET(req: Request) {
  await requireAdmin();

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(10, Number(url.searchParams.get("pageSize") ?? "20") || 20));
  const q = (url.searchParams.get("q") ?? "").trim();

  const supabase = createSupabaseAdminClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let db = supabase
    .from("questions")
    .select("id,title,difficulty_weight,estimated_minutes,is_mock,created_at,skill_ids", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (q) {
    db = db.ilike("title", `%${q}%`);
  }

  const { data, error, count } = await db.range(from, to);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const total = count ?? 0;

  return NextResponse.json({
    items: data ?? [],
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

export async function POST(req: Request) {
  await requireAdmin();

  const body = await req.json();

  const skillIds = Array.isArray(body?.skill_ids) ? body.skill_ids : [];
  if (skillIds.length) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from("skills").select("id").in("id", skillIds);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const found = new Set((data ?? []).map((r) => r.id));
    const missing = skillIds.filter((id: string) => !found.has(id));
    if (missing.length) {
      return NextResponse.json({ error: "UNKNOWN_SKILL_ID", missing }, { status: 400 });
    }
  }

  const created = await createQuestionUseCase(body);
  return NextResponse.json({ ok: true, created });
}
