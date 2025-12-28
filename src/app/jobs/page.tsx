"use client";

import { useEffect, useState } from "react";
import createSupabaseBrowserClient from "@/core/supabase/browser";
import { Loader } from "../components/loader";

type JobSummary = {
  id: string;
  company: string;
  role_title: string;
  status: string;
  priority_weight: number;
  created_at: string;
  fit?: { overall_fit: number; skills_match: number; cv_match: number } | null;
};

export default function JobsPage() {
  const [items, setItems] = useState<JobSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    const res = await fetch("/api/dashboard/summary", {
      cache: "no-store",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!res.ok) {
      setError("Failed to load");
      setLoading(false);
      return;
    }

    const json = await res.json();
    setItems(
      (json.jobs ?? []).map((j: any) => ({
        ...j,
        fit: j.fit
          ? {
              overall_fit: j.fit.overall_fit,
              skills_match: j.fit.skills_match,
              cv_match: j.fit.cv_match,
            }
          : null,
      }))
    );
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <div className="page"><Loader label="Loading jobs..." /></div>;

  return (
    <div className="page" style={{ display: "grid", gap: 12 }}>
      <div className="section-title">
        <div>
          <h1 style={{ margin: 0 }}>Jobs</h1>
          <div style={{ color: "#475569" }}>Track targets, extract requirements with AI, and monitor fit.</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a className="primary-link" href="/jobs/new">Add job</a>
          <a className="ghost-link" href="/dashboard">Dashboard</a>
        </div>
      </div>
      {error && <div className="card" style={{ color: "#b91c1c" }}>{error}</div>}
      <div className="card" style={{ display: "grid", gap: 12 }}>
        {items.map((j) => (
          <div key={j.id} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div>
                <a href={`/jobs/${j.id}/overview`} style={{ fontWeight: 700, fontSize: 16 }}>
                  {j.company} — {j.role_title}
                </a>
                <div style={{ color: "#475569", marginTop: 4 }}>
                  Status: {j.status} • Priority: {j.priority_weight}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{j.fit ? `${j.fit.overall_fit.toFixed(0)}%` : "N/A"}</div>
                {j.fit && (
                  <div style={{ fontSize: 12, color: "#475569" }}>
                    Skills {j.fit.skills_match.toFixed(0)}% • CV {j.fit.cv_match.toFixed(0)}%
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <a className="ghost-link" href={`/jobs/${j.id}/overview`}>Overview</a>
              <a className="ghost-link" href={`/jobs/${j.id}/requirements`}>Requirements</a>
            </div>
          </div>
        ))}
        {items.length === 0 && <div>No jobs yet. <a href="/jobs/new">Create your first target job.</a></div>}
      </div>
    </div>
  );
}
