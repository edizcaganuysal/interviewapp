"use client";

import { useState } from "react";
import createSupabaseBrowserClient from "@/core/supabase/browser";

export default function OnboardingJobsPage() {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState(5);
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
        priority_weight: priority,
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
    <div className="page" style={{ display: "grid", gap: 12 }}>
      <div className="card" style={{ maxWidth: 720, margin: "0 auto", display: "grid", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Onboarding: Jobs</h1>
        <p style={{ color: "#475569" }}>Add at least one target job. We will extract requirements later.</p>
        {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
        <form onSubmit={submit} className="grid">
        <input placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} required />
        <input placeholder="Role title" value={role} onChange={(e) => setRole(e.target.value)} required />
        <textarea placeholder="Job description" value={desc} onChange={(e) => setDesc(e.target.value)} rows={5} required />
        <label>
          Importance (1-10)
          <input
            type="number"
            min={1}
            max={10}
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
          />
        </label>
        <button type="submit" className="primary">Add job</button>
      </form>

        {createdIds.length > 0 && (
          <div className="card" style={{ background: "#f8fafc" }}>
            <h3 style={{ margin: 0 }}>Created jobs</h3>
            <ul>
              {createdIds.map((id) => (
                <li key={id}><a href={`/jobs/${id}/overview`}>{id}</a></li>
              ))}
            </ul>
          </div>
        )}

        <a className="primary-link" href="/onboarding/done">Finish</a>
      </div>
    </div>
  );
}
