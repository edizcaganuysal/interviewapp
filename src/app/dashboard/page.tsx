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

  useEffect(() => {
    load();
  }, []);

  if (loading) return <div className="page"><Loader label="Loading your workspace..." /></div>;

  const totalFit =
    items.length > 0
      ? Math.round(
          items.reduce((acc, j) => acc + (j.fit?.overall_fit ?? 0), 0) / items.length
        )
      : 0;

  return (
    <div className="page" style={{ display: "grid", gap: 16 }}>
      <div className="section-title">
        <div>
          <h1 style={{ margin: 0 }}>Dashboard</h1>
          <div style={{ color: "#475569" }}>Your weekly pulse: jobs, fit, and practice</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a className="ghost-link" href="/practice/today">Today&apos;s practice</a>
          <a className="ghost-link" href="/jobs">Jobs</a>
        </div>
      </div>

      {error && <div className="card" style={{ color: "#b91c1c" }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}>
        <div className="card">
          <div className="section-title">
            <div>Avg fit across jobs</div>
            <div className="pill">{totalFit || "N/A"}%</div>
          </div>
          <p style={{ margin: 0, color: "#475569" }}>Higher means your skills, CV, and education align.</p>
        </div>
        <div className="card">
          <div className="section-title">
            <div>Jobs tracked</div>
            <div className="pill">{items.length}</div>
          </div>
          <p style={{ margin: 0, color: "#475569" }}>Manage targets in Jobs tab with requirement extraction.</p>
        </div>
        <div className="card">
          <div className="section-title">
            <div>Practice</div>
            <a className="primary-link" href="/practice/today">Start today</a>
          </div>
          <p style={{ margin: 0, color: "#475569" }}>Log attempts to move fit in real time.</p>
        </div>
      </div>

      <div className="card" style={{ display: "grid", gap: 12 }}>
        <div className="section-title">
          <h3 style={{ margin: 0 }}>Jobs & fit</h3>
          <a className="ghost-link" href="/jobs">See all</a>
        </div>
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
                <div style={{ fontSize: 20, fontWeight: 800 }}>{j.fit ? j.fit.overall_fit.toFixed(0) + "%" : "N/A"}</div>
                {j.fit && (
                  <div style={{ fontSize: 12, color: "#475569" }}>
                    Skills {j.fit.skills_match.toFixed(0)}% • CV {j.fit.cv_match.toFixed(0)}%
                  </div>
                )}
              </div>
            </div>
            {j.fit?.explanation_json && (
              <div style={{ marginTop: 8, display: "flex", gap: 12, flexWrap: "wrap", color: "#475569" }}>
                <div><b>Gaps:</b> {(j.fit.explanation_json.top_gaps ?? []).map((g: any) => g.skill_id).join(", ")}</div>
                <div><b>Actions:</b> {(j.fit.explanation_json.recommended_actions ?? [])
                  .map((a: any) => (a.related_skill_ids || []).join(","))
                  .join("; ") || "Review practice plan"}</div>
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && <div>No jobs yet. <a href="/jobs/new">Create your first target job.</a></div>}
      </div>
    </div>
  );
}
