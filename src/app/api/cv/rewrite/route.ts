import { NextResponse } from "next/server";
import { rewriteCVSuggestions } from "@/features/ai/ai.service";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const text = String(body?.text ?? "");
  if (!text.trim()) return NextResponse.json({ error: "EMPTY_TEXT" }, { status: 400 });

  try {
    const suggestions = await rewriteCVSuggestions(text);
    return NextResponse.json({ ok: true, suggestions });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "AI_FAILED" }, { status: 500 });
  }
}
