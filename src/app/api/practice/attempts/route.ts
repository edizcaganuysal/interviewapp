import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/core/supabase/server";
import { requireUserFromRequest } from "@/core/auth/require-user";
import { submitAttempt } from "@/features/practice/attempts.service";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient(req);
  let user;
  try {
    ({ user } = await requireUserFromRequest(req, supabase));
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json();
  try {
    const result = await submitAttempt(user.id, body, req);
    return NextResponse.json({ ok: true, attemptId: result.attemptId, deltas: result.deltas });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "FAILED" }, { status: 400 });
  }
}
