"use client";

import { useState } from "react";
import createSupabaseBrowserClient from "@/core/supabase/browser";

export default function OnboardingJobsPage() {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [desc, setDesc] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [createdIds, setCreatedIds] = useState<string[]>([]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        company,
        role_title: role,
        description_text: desc,
        status: "target",
        priority_weight: 3,
      }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setError(json?.error ?? "Create failed");
      return;
    }
    setCreatedIds((prev) => [...prev, json.id]);
    setCompany("");
    setRole("");
    setDesc("");
  }

  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      <h1>Onboarding: Jobs</h1>
      {error && <p>{error}</p>}
      <form onSubmit={submit} style={{ display: "grid", gap: 8, maxWidth: 520 }}>
        <input placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} required />
        <input placeholder="Role title" value={role} onChange={(e) => setRole(e.target.value)} required />
        <textarea placeholder="Job description" value={desc} onChange={(e) => setDesc(e.target.value)} rows={5} required />
        <button type="submit">Add job</button>
      </form>

      {createdIds.length > 0 && (
        <div>
          <h3>Created jobs</h3>
          <ul>
            {createdIds.map((id) => (
              <li key={id}><a href={`/jobs/${id}/overview`}>{id}</a></li>
            ))}
          </ul>
        </div>
      )}

      <a href="/onboarding/done">Finish</a>
    </div>
  );
}
