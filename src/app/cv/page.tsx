"use client";

import { useEffect, useState } from "react";
import createSupabaseBrowserClient from "@/core/supabase/browser";

export default function CvPage() {
  const [text, setText] = useState("");
  const [education, setEducation] = useState("bachelor");
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [cvFile, setCvFile] = useState<string | null>(null);
  const [transcriptFile, setTranscriptFile] = useState<string | null>(null);
  const [cvFileData, setCvFileData] = useState<{ base64: string; mime: string | null } | null>(null);
  const [transcriptFileData, setTranscriptFileData] = useState<{ base64: string; mime: string | null } | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [downloadState, setDownloadState] = useState<"idle" | "downloading">("idle");

  async function loadLatest() {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const res = await fetch("/api/cv/latest", {
      cache: "no-store",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const json = await res.json().catch(() => null);
    if (res.ok && json?.item) {
      const parsed = json.item.parsed_json ?? {};
      setText(json.item.extracted_text ?? "");
      setTranscript(parsed?.transcript_text ?? "");
      setEducation(parsed?.education_level ?? "bachelor");
      setLastSaved(json.item.created_at);
      setCvFile(parsed?.cv_filename ?? null);
      setTranscriptFile(parsed?.transcript_filename ?? null);
      if (parsed?.cv_file_base64) setCvFileData({ base64: parsed.cv_file_base64, mime: parsed.cv_file_mime ?? "application/octet-stream" });
      else setCvFileData(null);
      if (parsed?.transcript_file_base64) setTranscriptFileData({ base64: parsed.transcript_file_base64, mime: parsed.transcript_file_mime ?? "application/octet-stream" });
      else setTranscriptFileData(null);
    } else {
      setText("");
      setTranscript("");
      setCvFile(null);
      setTranscriptFile(null);
      setCvFileData(null);
      setTranscriptFileData(null);
      setLastSaved(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadLatest();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setWarning(null);
    setEvaluating(true);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!text.trim()) {
      setError("CV text is empty. Please upload or edit in the editor.");
      setEvaluating(false);
      return;
    }

    const res = await fetch("/api/cv/evaluate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ cv_text: text, education_level: education, transcript_text: transcript }),
    });
    const json = await res.json().catch(() => null);
    setEvaluating(false);
    if (!res.ok) {
      setError(json?.error ?? "Failed");
      return;
    }
    if ((json?.matched ?? []).length === 0) {
      setWarning("No skills detected; please ensure the CV text is clear.");
    } else {
      setWarning(null);
    }
    setResult(json);
    setLastSaved(json.cv_id ? new Date().toISOString() : lastSaved);
  }

  async function uploadAndExtract(file: File, kind: "cv" | "transcript") {
    setStatus("Extracting file...");
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/cv/upload", { method: "POST", body: form });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setError(json?.error ?? "Upload failed");
      setStatus(null);
      return;
    }
    if (!json?.text) {
      setError("No text extracted from file. Please try another file or paste text in the editor.");
      setStatus(null);
      return;
    }
    const filename = json.filename ?? file.name;
    const base64 = json.file_base64 ?? "";
    const mime = json.mime ?? (kind === "cv" ? "application/pdf" : "application/pdf");
    if (kind === "cv") {
      setText(json.text ?? "");
      setCvFile(filename);
      setCvFileData(base64 ? { base64, mime } : null);
      if (cvFile && cvFile !== filename) setStatus("File replaced");
      await savePersist(json.text ?? "", transcript, filename, transcriptFile, base64 ? { base64, mime } : cvFileData, transcriptFileData);
    } else {
      setTranscript(json.text ?? "");
      setTranscriptFile(filename);
      setTranscriptFileData(base64 ? { base64, mime } : null);
      if (transcriptFile && transcriptFile !== filename) setStatus("File replaced");
      await savePersist(text, json.text ?? "", cvFile, filename, cvFileData, base64 ? { base64, mime } : transcriptFileData);
    }
    setStatus(null);
  }

  async function savePersist(
    cvText: string,
    transcriptText: string,
    cvFilename: string | null,
    transcriptFilename: string | null,
    cvData?: { base64: string; mime: string | null } | null,
    transcriptData?: { base64: string; mime: string | null } | null,
  ) {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const res = await fetch("/api/cv/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        cv_text: cvText,
        transcript_text: transcriptText,
        education_level: education,
        cv_filename: cvFilename,
        transcript_filename: transcriptFilename,
        cv_file_base64: cvData?.base64,
        cv_file_mime: cvData?.mime,
        transcript_file_base64: transcriptData?.base64,
        transcript_file_mime: transcriptData?.mime,
      }),
    });
    const json = await res.json().catch(() => null);
    if (res.ok && json?.created_at) setLastSaved(json.created_at);
    if (!res.ok) setError(json?.error ?? "Save failed");
    if (res.ok) setStatus("Saved");
  }

  async function deleteAll() {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const res = await fetch("/api/cv/delete", { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      setError(json?.error ?? "Delete failed");
      return;
    }
    setText("");
    setTranscript("");
    setCvFile(null);
    setTranscriptFile(null);
    setCvFileData(null);
    setTranscriptFileData(null);
    setLastSaved(null);
    setStatus(null);
  }

  function downloadFile(content: string, filename: string, data?: { base64: string; mime: string | null }) {
    setDownloadState("downloading");
    let blob: Blob;
    if (data?.base64) {
      const byteChars = atob(data.base64);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i += 1) {
        byteNumbers[i] = byteChars.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      blob = new Blob([byteArray], { type: data.mime ?? "application/octet-stream" });
    } else {
      blob = new Blob([content || ""], { type: "text/plain" });
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "cv";
    a.click();
    URL.revokeObjectURL(url);
    setTimeout(() => setDownloadState("idle"), 500);
  }

  return (
    <div className="page" style={{ display: "grid", gap: 16, maxWidth: 960 }}>
      <div className="section-title">
        <div>
          <h1 style={{ margin: 0 }}>CV Upload & Evaluation</h1>
          <div style={{ color: "#475569" }}>Upload, evaluate, and keep the site in English.</div>
          {lastSaved && <small style={{ color: "#0f172a" }}>Saved on {new Date(lastSaved).toLocaleString()}</small>}
          {status && <small style={{ color: "#0f172a" }}>{status}</small>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a className="ghost-link" href="/cv/edit">Edit CV</a>
          <a className="ghost-link" href="/cv/transcript-edit">Edit Transcript</a>
          <a className="ghost-link" href="/dashboard">Dashboard</a>
        </div>
      </div>
      {error && <div className="card" style={{ color: "#b91c1c" }}>{error}</div>}
      {warning && <div className="card" style={{ color: "#b45309" }}>{warning}</div>}

      <div className="card" style={{ display: "grid", gap: 12, opacity: loading ? 0.6 : 1 }}>
        <form onSubmit={submit} className="grid">
          <label>
            Highest education
            <select value={education} onChange={(e) => setEducation(e.target.value)}>
              <option value="highschool">High school</option>
              <option value="undergrad_student">Undergrad student</option>
              <option value="bachelor">Bachelor</option>
              <option value="master">Master</option>
              <option value="phd">PhD</option>
              <option value="other">Other</option>
            </select>
          </label>

          <div className="card" style={{ display: "grid", gap: 8, border: "1px dashed #cbd5e1" }}>
            <div className="section-title">
              <h3 style={{ margin: 0 }}>CV file</h3>
              {cvFile && <div className="pill">Current: {cvFile}</div>}
            </div>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadAndExtract(file, "cv");
              }}
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="primary"
                onClick={() => cvFile && downloadFile(text, `${cvFile || "cv"}`, cvFileData || undefined)}
                disabled={downloadState === "downloading"}
              >
                {downloadState === "downloading" ? "Downloading..." : "Download file"}
              </button>
              <button
                type="button"
                className="ghost-link"
                onClick={() => {
                  setCvFile(null);
                  setCvFileData(null);
                  setText("");
                  savePersist("", transcript, null, transcriptFile, null, transcriptFileData);
                  setStatus("File removed");
                }}
              >
                Delete file
              </button>
            </div>
          </div>

          <div className="card" style={{ display: "grid", gap: 8, border: "1px dashed #cbd5e1" }}>
            <div className="section-title">
              <h3 style={{ margin: 0 }}>Transcript file</h3>
              {transcriptFile && <div className="pill">Current: {transcriptFile}</div>}
            </div>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadAndExtract(file, "transcript");
              }}
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="primary"
                onClick={() => transcriptFile && downloadFile(transcript, `${transcriptFile || "transcript"}`, transcriptFileData || undefined)}
                disabled={downloadState === "downloading"}
              >
                {downloadState === "downloading" ? "Downloading..." : "Download file"}
              </button>
              <button
                type="button"
                className="ghost-link"
                onClick={() => {
                  setTranscriptFile(null);
                  setTranscriptFileData(null);
                  setTranscript("");
                  savePersist(text, "", cvFile, null, cvFileData, null);
                  setStatus("File removed");
                }}
              >
                Delete file
              </button>
            </div>
          </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="primary" disabled={evaluating}>
              {evaluating ? "Evaluating..." : "Evaluate CV"}
            </button>
            <button type="button" className="ghost-link" onClick={deleteAll}>Delete all</button>
          </div>
          <small style={{ color: "#475569" }}>
            Edit in the dedicated editors; uploads stay saved.
          </small>
        </div>
        </form>
      </div>

        {result && (
          <div className="card" style={{ display: "grid", gap: 8 }}>
            <h3 style={{ margin: 0 }}>CV evaluated successfully</h3>
            <div>Matched skills: {result.matched?.length ?? 0}</div>
            <div>New skills created: {(result.created_skills ?? []).join(", ") || "None"}</div>
          <div>Skills from courses: {(result.mapped_from_courses ?? []).length}</div>
          {Array.isArray(result.hidden_skills) && result.hidden_skills.length > 0 && (
            <div style={{ color: "#b45309" }}>
              ⚠️ These skills were detected but CV evidence was unclear: {result.hidden_skills.join(", ")}. Please add clear bullets.
            </div>
          )}
          <div className="pill">Fit scores updated</div>
        </div>
      )}
    </div>
  );
}
