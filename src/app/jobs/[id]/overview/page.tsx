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
  const [descDraft, setDescDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

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
    setDescDraft(json.item?.description_text ?? "");
  }

  useEffect(() => {
    load();
  }, [params.id]);

  if (error) {
    return (
      <div className="page">
        <div className="card">
          <h1>Job Overview</h1>
          <p>{error}</p>
          <a className="ghost-link" href="/jobs">Back to Jobs</a>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="page">
        <div className="card">Loading...</div>
      </div>
    );
  }

  const experienceWarnings =
    fit?.perSkill
      ?.filter(
        (r: any) =>
          r.strictness === "mandatory" && Number(r.required_months_experience ?? 0) > Number(r.user_months_experience ?? 0)
      )
      .map(
        (r: any) =>
          `${r.skill_id}: ${r.user_months_experience ?? 0} / ${r.required_months_experience ?? 0} ay (mandatory)`
      ) ?? [];
  const educationWarning = fit?.edu_penalty && fit.edu_penalty < 1 ? "Education level may be below requirement" : null;

  return (
    <div className="page" style={{ display: "grid", gap: 12 }}>
      <div className="section-title">
        <div>
          <h1 style={{ margin: 0 }}>{job.company} — {job.role_title}</h1>
          <div style={{ color: "#475569" }}>Status: {job.status} • Priority: {job.priority_weight}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a className="ghost-link" href={`/jobs/${job.id}/requirements`}>Edit requirements</a>
          <a className="ghost-link" href="/jobs">All jobs</a>
        </div>
      </div>

      <div className="card">
        <div className="section-title">
          <h3 style={{ margin: 0 }}>Description</h3>
          {notice && <div className="pill">{notice}</div>}
        </div>
        <textarea
          rows={8}
          value={descDraft}
          onChange={(e) => setDescDraft(e.target.value)}
          placeholder="Describe the role..."
        />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            className="primary"
            type="button"
            disabled={saving || !descDraft.trim()}
            onClick={async () => {
              setSaving(true);
              setNotice(null);
              setError(null);
              const supabase = createSupabaseBrowserClient();
              const { data } = await supabase.auth.getSession();
              const token = data.session?.access_token;
              const res = await fetch(`/api/jobs/${job.id}`, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ description_text: descDraft }),
              });
              const json = await res.json().catch(() => null);
              setSaving(false);
              if (!res.ok) {
                setError(json?.error ?? "Update failed");
                return;
              }
              setNotice("Updated and re-extracted requirements");
              load();
            }}
          >
            {saving ? "Updating..." : "Save & re-extract"}
          </button>
          <span style={{ color: "#475569" }}>We’ll refresh requirements and fit after each edit.</span>
        </div>
      </div>

      {fit && (
        <div className="card" style={{ display: "grid", gap: 10 }}>
          <div className="section-title">
            <h3 style={{ margin: 0 }}>Fit snapshot</h3>
            <div className="pill">Education: {fit.education_level ?? "n/a"}</div>
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <div className="pill">Overall {fit.overall_fit?.toFixed?.(0)}</div>
            <div className="pill">Skills {fit.skills_match?.toFixed?.(0)}</div>
            <div className="pill">CV {fit.cv_match?.toFixed?.(0)}</div>
          </div>
          {(experienceWarnings.length > 0 || educationWarning) && (
            <div style={{ color: "#b91c1c" }}>
              <b>Warnings:</b>{" "}
              {[...experienceWarnings, educationWarning].filter(Boolean).join(" | ")}
            </div>
          )}
          <h4 style={{ margin: "6px 0" }}>Key requirements</h4>
          <table className="pro">
            <thead>
              <tr>
                <th>Skill</th>
                <th>Required</th>
                <th>Importance</th>
                <th>Your level</th>
                <th>Experience</th>
                <th>Match</th>
              </tr>
            </thead>
            <tbody>
              {(fit.perSkill ?? []).map((r: any) => (
                <tr key={r.skill_id}>
                  <td>{r.skill_id}</td>
                  <td>{r.required_level}</td>
                  <td>{r.importance}</td>
                  <td>{r.user_level?.toFixed?.(1) ?? 0}</td>
                  <td>
                    {r.required_months_experience
                      ? `${r.user_months_experience ?? 0} / ${r.required_months_experience} mo`
                      : "N/A"}{" "}
                    ({r.strictness ?? "preferred"})
                  </td>
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
