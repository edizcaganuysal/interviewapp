"use client";

import { useEffect, useState } from "react";
import createSupabaseBrowserClient from "@/core/supabase/browser";

type Job = {
  id: string;
  company: string;
  role_title: string;
  description_text: string;
  status: string;
  priority_weight: number;
  created_at: string;
};

export default function JobOverviewPage({ params }: { params: { id: string } }) {
  const [job, setJob] = useState<Job | null>(null);
  const [fit, setFit] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    const res = await fetch(`/api/jobs/${params.id}`, {
      cache: "no-store",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      setError(json?.error ?? "Failed to load");
      return;
    }

    setJob(json.item);
    setFit(json.fit ?? null);
  }

  useEffect(() => {
    load();
  }, [params.id]);

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <h1>Job Overview</h1>
        <p>{error}</p>
        <a href="/jobs">Back to Jobs</a>
      </div>
    );
  }

  if (!job) {
    return (
      <div style={{ padding: 16 }}>
        <h1>Job Overview</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>{job.company} — {job.role_title}</h1>

      <div style={{ margin: "8px 0" }}>
        <a href={`/jobs/${job.id}/overview`}>Overview</a>{" | "}
        <a href={`/jobs/${job.id}/requirements`}>Requirements</a>{" | "}
        <a href="/jobs">All Jobs</a>
      </div>

      <div style={{ marginTop: 12 }}>
        <p><b>Status:</b> {job.status}</p>
        <p><b>Priority:</b> {job.priority_weight}</p>
        <p><b>Created:</b> {new Date(job.created_at).toLocaleString()}</p>
      </div>

      <h3 style={{ marginTop: 16 }}>Description</h3>
      <pre style={{ whiteSpace: "pre-wrap" }}>{job.description_text}</pre>

      {fit && (
        <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
          <h3>Fit snapshot</h3>
          <div>Overall fit: {fit.overall_fit?.toFixed?.(1)}</div>
          <div>Skills match: {fit.skills_match?.toFixed?.(1)} | CV match: {fit.cv_match?.toFixed?.(1)}</div>
          {fit.education_level && <div>Education level: {fit.education_level}</div>}
          <h4 style={{ marginTop: 8 }}>Requirements</h4>
          <table cellPadding={6} style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th align="left">Skill</th>
                <th align="left">Required</th>
                <th align="left">Importance</th>
                <th align="left">Your level</th>
                <th align="left">Match</th>
              </tr>
            </thead>
            <tbody>
              {(fit.perSkill ?? []).map((r: any) => (
                <tr key={r.skill_id} style={{ borderTop: "1px solid #eee" }}>
                  <td>{r.skill_id}</td>
                  <td>{r.required_level}</td>
                  <td>{r.importance}</td>
                  <td>{r.user_level?.toFixed?.(1) ?? 0}</td>
                  <td>{(r.match * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
