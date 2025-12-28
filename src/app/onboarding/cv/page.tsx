"use client";

import { useState } from "react";
import createSupabaseBrowserClient from "@/core/supabase/browser";

export default function OnboardingCvPage() {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    const res = await fetch("/api/onboarding/cv", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ text }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setError(json?.error ?? "Save failed");
      return;
    }
    window.location.href = "/onboarding/courses";
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Onboarding: CV</h1>
      {error && <p>{error}</p>}
      <form onSubmit={submit} style={{ display: "grid", gap: 8, maxWidth: 600 }}>
        <label>
          Paste your CV text
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} required />
        </label>
        <button type="submit">Continue</button>
      </form>
    </div>
  );
}
