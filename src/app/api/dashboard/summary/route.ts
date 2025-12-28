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

  const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select("id,company,role_title,status,priority_weight")
    .eq("user_id", user.id)
    .order("priority_weight", { ascending: false });
  if (jobsError) return NextResponse.json({ error: jobsError.message }, { status: 500 });

  const { data: scores, error: scoreError } = await supabase
    .from("fit_scores")
    .select("job_id,overall_fit,skills_match,cv_match,portfolio_match,explanation_json")
    .eq("user_id", user.id);
  if (scoreError) return NextResponse.json({ error: scoreError.message }, { status: 500 });

  const scoreMap = new Map((scores ?? []).map((s) => [s.job_id, s]));

  return NextResponse.json({
    jobs: (jobs ?? []).map((j) => ({
      ...j,
      fit: scoreMap.get(j.id) ?? null,
    })),
  });
}
