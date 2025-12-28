"use client";

import { useState } from "react";
import createSupabaseBrowserClient from "@/core/supabase/browser";

export default function OnboardingGoalPage() {
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    const res = await fetch("/api/onboarding/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ display_name: displayName }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setError(json?.error ?? "Save failed");
      return;
    }
    window.location.href = "/onboarding/cv";
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Onboarding: Goal</h1>
      {error && <p>{error}</p>}
      <form onSubmit={submit} style={{ display: "grid", gap: 8, maxWidth: 420 }}>
        <label>
          Preferred name
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
        </label>
        <button type="submit">Continue</button>
      </form>
    </div>
  );
}
