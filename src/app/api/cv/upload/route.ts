import { NextResponse } from "next/server";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function extractPdf(buffer: Buffer) {
  try {
    const data = await pdfParse(buffer);
    return data.text || "";
  } catch {
    return "";
  }
}

async function extractDocx(buffer: Buffer) {
  try {
    const { value } = await mammoth.extractRawText({ buffer });
    return value || "";
  } catch {
    return "";
  }
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "FILE_REQUIRED" }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const name = file.name || "upload";
    const lower = name.toLowerCase();
    const mime = file.type || (lower.endsWith(".pdf") ? "application/pdf" : lower.endsWith(".doc") || lower.endsWith(".docx") ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "text/plain");

    let text = "";
    if (lower.endsWith(".pdf")) {
      text = await extractPdf(buffer);
    }
    if (!text && (lower.endsWith(".docx") || lower.endsWith(".doc"))) {
      text = await extractDocx(buffer);
    }
    if (!text && lower.endsWith(".txt")) {
      text = buffer.toString("utf8");
    }
    if (!text) {
      text = buffer.toString("utf8");
    }

    text = text.replace(/\r/g, "").trim();
    if (!text) return NextResponse.json({ error: "NO_TEXT_EXTRACTED" }, { status: 400 });

    const file_base64 = buffer.toString("base64");

    return NextResponse.json({ ok: true, text, filename: name, mime, file_base64 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "PARSE_FAILED" }, { status: 500 });
  }
}
