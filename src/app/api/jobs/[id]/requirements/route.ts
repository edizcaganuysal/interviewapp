import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/core/supabase/server";
import { requireUserFromRequest } from "@/core/auth/require-user";
import {
  addJobRequirement,
  getJobRequirements,
  patchJobRequirement,
  removeJobRequirement,
} from "@/features/jobs/requirements.service";

export async function GET(req: Request, ctx: { params: { id: string } }) {
  const supabase = await createSupabaseServerClient(req);
  let user;
  try {
    ({ user } = await requireUserFromRequest(req, supabase));
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  // ownership check via jobs table
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id")
    .eq("id", ctx.params.id)
    .eq("user_id", user.id)
    .single();
  if (jobError || !job) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const items = await getJobRequirements(ctx.params.id, req);
  return NextResponse.json({ items });
}

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const supabase = await createSupabaseServerClient(req);
  let user;
  try {
    ({ user } = await requireUserFromRequest(req, supabase));
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id")
    .eq("id", ctx.params.id)
    .eq("user_id", user.id)
    .single();
  if (jobError || !job) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const body = await req.json();
  try {
    const id = await addJobRequirement(ctx.params.id, body, req);
    return NextResponse.json({ ok: true, id });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "INVALID" }, { status: 400 });
  }
}

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const supabase = await createSupabaseServerClient(req);
  let user;
  try {
    ({ user } = await requireUserFromRequest(req, supabase));
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json();
  const requirementId = body?.id;
  if (!requirementId) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  const { data: jobReq, error: reqError } = await supabase
    .from("job_skill_requirements")
    .select("job_id")
    .eq("id", requirementId)
    .single();
  if (reqError || !jobReq) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id,user_id")
    .eq("id", jobReq.job_id)
    .single();
  if (jobError || !job || job.user_id !== user.id) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  await patchJobRequirement(requirementId, body, req);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, ctx: { params: { id: string } }) {
  const supabase = await createSupabaseServerClient(req);
  let user;
  try {
    ({ user } = await requireUserFromRequest(req, supabase));
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const url = new URL(req.url);
  const reqId = url.searchParams.get("reqId");
  if (!reqId) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  const { data: jobReq, error: reqError } = await supabase
    .from("job_skill_requirements")
    .select("job_id")
    .eq("id", reqId)
    .single();
  if (reqError || !jobReq) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id,user_id")
    .eq("id", jobReq.job_id)
    .single();
  if (jobError || !job || job.user_id !== user.id) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  await removeJobRequirement(reqId, req);
  return NextResponse.json({ ok: true });
}
