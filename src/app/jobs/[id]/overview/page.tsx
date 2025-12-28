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
    </div>
  );
}
