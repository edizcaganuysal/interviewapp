import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/core/supabase/server";
import { requireUserFromRequest } from "@/core/auth/require-user";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient(req);
  let user;
  try {
    ({ user } = await requireUserFromRequest(req, supabase));
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) ?? {};
  const hasCvText = Object.prototype.hasOwnProperty.call(body, "cv_text");
  const hasTranscriptText = Object.prototype.hasOwnProperty.call(body, "transcript_text");
  const hasEducation = Object.prototype.hasOwnProperty.call(body, "education_level");
  const hasCvFilename = Object.prototype.hasOwnProperty.call(body, "cv_filename");
  const hasTranscriptFilename = Object.prototype.hasOwnProperty.call(body, "transcript_filename");
  const hasCvFileBase64 = Object.prototype.hasOwnProperty.call(body, "cv_file_base64");
  const hasTranscriptFileBase64 = Object.prototype.hasOwnProperty.call(body, "transcript_file_base64");
  const hasCvFileMime = Object.prototype.hasOwnProperty.call(body, "cv_file_mime");
  const hasTranscriptFileMime = Object.prototype.hasOwnProperty.call(body, "transcript_file_mime");

  const cv_text = hasCvText ? String(body?.cv_text ?? "") : null;
  const transcript_text = hasTranscriptText ? String(body?.transcript_text ?? "") : null;
  const education_level = hasEducation ? String(body?.education_level ?? "other") : null;
  const cv_filename = hasCvFilename ? body?.cv_filename ?? null : undefined;
  const transcript_filename = hasTranscriptFilename ? body?.transcript_filename ?? null : undefined;
  const cv_file_base64 = hasCvFileBase64 ? body?.cv_file_base64 ?? null : undefined;
  const transcript_file_base64 = hasTranscriptFileBase64 ? body?.transcript_file_base64 ?? null : undefined;
  const cv_file_mime = hasCvFileMime ? body?.cv_file_mime ?? null : undefined;
  const transcript_file_mime = hasTranscriptFileMime ? body?.transcript_file_mime ?? null : undefined;

  const { data: existing } = await supabase
    .from("cvs")
    .select("id,extracted_text,parsed_json,storage_path,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Ensure single active CV per user: delete previous then insert
  await supabase.from("cvs").delete().eq("user_id", user.id);

  const parsed = existing?.parsed_json ?? {};
  const mergedCvFileBase64 = cv_file_base64 !== undefined ? cv_file_base64 : parsed?.cv_file_base64 ?? null;
  const mergedCvFileMime = cv_file_mime !== undefined ? cv_file_mime : parsed?.cv_file_mime ?? null;
  const mergedTranscriptFileBase64 = transcript_file_base64 !== undefined ? transcript_file_base64 : parsed?.transcript_file_base64 ?? null;
  const mergedTranscriptFileMime = transcript_file_mime !== undefined ? transcript_file_mime : parsed?.transcript_file_mime ?? null;

  const mergedParsed = {
    education_level: education_level ?? parsed?.education_level ?? "other",
    transcript_text: transcript_text ?? parsed?.transcript_text ?? "",
    cv_filename: cv_filename !== undefined ? cv_filename : parsed?.cv_filename ?? null,
    transcript_filename: transcript_filename !== undefined ? transcript_filename : parsed?.transcript_filename ?? null,
    cv_file_base64: mergedCvFileBase64,
    cv_file_mime: mergedCvFileMime,
    transcript_file_base64: mergedTranscriptFileBase64,
    transcript_file_mime: mergedTranscriptFileMime,
  };

  const { data, error } = await supabase
    .from("cvs")
    .insert({
      user_id: user.id,
      storage_path: existing?.storage_path ?? "inline",
      extracted_text: cv_text ?? existing?.extracted_text ?? "",
      parsed_json: mergedParsed,
      created_at: new Date().toISOString(),
    })
    .select("id,created_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, id: data.id, created_at: data.created_at });
}
