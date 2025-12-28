import { NextResponse } from "next/server";
import { requireAdmin } from "@/core/auth/require-admin";
import { updateQuestionUseCase, deleteQuestionUseCase } from "@/features/admin/questions.service";

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  await requireAdmin();

  const body = await req.json();
  await updateQuestionUseCase(ctx.params.id, body);

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  await requireAdmin();

  await deleteQuestionUseCase(ctx.params.id);
  return NextResponse.json({ ok: true });
}
