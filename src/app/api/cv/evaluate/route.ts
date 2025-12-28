import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/core/supabase/server";
import { requireUserFromRequest } from "@/core/auth/require-user";
import { evaluateCv } from "@/features/cv/cv.service";
import { recomputeFitScoresForSkills } from "@/features/jobs/fit-score.service";

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
    const result = await evaluateCv(user.id, body, req);
    await recomputeFitScoresForSkills(user.id, result.matched.map((m) => m.skill_id), req);
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "FAILED" }, { status: 400 });
  }
}
