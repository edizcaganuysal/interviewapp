import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/core/supabase/server";
import { requireUserFromRequest } from "@/core/auth/require-user";
import { recomputeAllFitScores } from "@/features/jobs/fit-score.service";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient(req);
  try {
    await requireUserFromRequest(req, supabase);
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    await recomputeAllFitScores(req);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "ERROR" }, { status: 500 });
  }
}
