import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/core/supabase/server";
import { requireUserFromRequest } from "@/core/auth/require-user";
import { getJobFitDetail } from "@/features/jobs/fit-score.service";

export async function GET(req: Request, ctx: { params: { id: string } }) {
  const supabase = await createSupabaseServerClient(req);
  let user;
  try {
    ({ user } = await requireUserFromRequest(req, supabase));
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const detail = await getJobFitDetail(user.id, ctx.params.id, req);
    return NextResponse.json({ item: detail.job, fit: detail });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "FAILED" }, { status: 500 });
  }
}
