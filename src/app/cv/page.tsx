"use client";

import { useState } from "react";
import createSupabaseBrowserClient from "@/core/supabase/browser";

export default function CvPage() {
  const [text, setText] = useState("");
  const [education, setEducation] = useState("bachelor");
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    const res = await fetch("/api/cv/evaluate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ cv_text: text, education_level: education, transcript_text: transcript }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setError(json?.error ?? "Failed");
      return;
    }
    setResult(json);
  }

  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      <h1>CV Upload & Evaluation</h1>
      <p>Upload CV text and optional transcript. We will detect skills, create custom skills if needed, and update your skill profile.</p>
      {error && <p>{error}</p>}
      <form onSubmit={submit} style={{ display: "grid", gap: 8, maxWidth: 760 }}>
        <label>
          Highest education
          <select value={education} onChange={(e) => setEducation(e.target.value)}>
            <option value="bachelor">Bachelor</option>
            <option value="master">Master</option>
            <option value="phd">PhD</option>
            <option value="bootcamp">Bootcamp</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>
          CV text
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} required />
        </label>
        <label>
          Transcript / course list (optional)
          <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={6} />
        </label>
        <button type="submit">Evaluate CV</button>
      </form>

      {result && (
        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
          <h3>Evaluation saved</h3>
          <div>Matched skills: {result.matched?.length ?? 0}</div>
          <div>New skills created: {(result.created_skills ?? []).join(", ") || "None"}</div>
          <div>Skills from courses: {(result.mapped_from_courses ?? []).length}</div>
        </div>
      )}
    </div>
  );
}
