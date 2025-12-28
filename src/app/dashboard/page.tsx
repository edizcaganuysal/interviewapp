"use client";

import { useEffect, useState } from "react";
import createSupabaseBrowserClient from "@/core/supabase/browser";

type JobSummary = {
  id: string;
  company: string;
  role_title: string;
  status: string;
  priority_weight: number;
  fit: {
    overall_fit: number;
    skills_match: number;
    cv_match: number;
    portfolio_match: number;
    explanation_json: any;
  } | null;
};

export default function DashboardPage() {
  const supabase = createSupabaseBrowserClient();
  const [items, setItems] = useState<JobSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setError(null);
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const res = await fetch("/api/dashboard/summary", {
      cache: "no-store",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setError(json?.error ?? "Failed to load");
      setLoading(false);
      return;
    }
    setItems(json.jobs ?? []);
    setLoading(false);
  }

  async function recompute() {
    setError(null);
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const res = await fetch("/api/fit-scores/recompute", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      setError("Recompute failed");
      return;
    }
    await load();
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <div style={{ padding: 16 }}>Loading…</div>;

  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      <h1>Dashboard</h1>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <a href="/jobs">Jobs</a>
        <a href="/practice/today">Practice</a>
        <a href="/skills">Skills</a>
        <button type="button" onClick={recompute}>Recompute Fit Scores</button>
      </div>

      {error && <p>{error}</p>}

      <div style={{ display: "grid", gap: 8 }}>
        {items.map((j) => (
          <div key={j.id} style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <a href={`/jobs/${j.id}/overview`}><b>{j.company} — {j.role_title}</b></a>
                <div>Status: {j.status} | Priority: {j.priority_weight}</div>
              </div>
              <div>
                <div>Fit: {j.fit ? j.fit.overall_fit.toFixed(1) : "N/A"}</div>
                {j.fit && <small>Skills {j.fit.skills_match.toFixed(1)} | CV {j.fit.cv_match.toFixed(1)}</small>}
              </div>
            </div>
            {j.fit?.explanation_json && (
              <details style={{ marginTop: 8 }}>
                <summary>Why?</summary>
                <div>
                  <div><b>Top gaps:</b> {(j.fit.explanation_json.top_gaps ?? []).map((g: any) => g.skill_id).join(", ")}</div>
                  <div><b>Recommended:</b> {(j.fit.explanation_json.recommended_actions ?? []).map((a: any) => (a.related_skill_ids || []).join(",")).join("; ")}</div>
                </div>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
