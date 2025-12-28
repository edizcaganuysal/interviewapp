"use client";

import { useEffect, useState } from "react";
import createSupabaseBrowserClient from "@/core/supabase/browser";

type Job = {
  id: string;
  company: string;
  role_title: string;
  status: string;
  priority_weight: number;
  created_at: string;
};

export default function JobsPage() {
  const [items, setItems] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    const res = await fetch("/api/jobs", {
      cache: "no-store",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!res.ok) {
      setError("Failed to load");
      return;
    }

    const json = await res.json();
    setItems(json.items ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h1>Jobs</h1>
      <a href="/jobs/new">Create new</a>

      {error && <p>{error}</p>}

      <ul>
        {items.map((j) => (
          <li key={j.id}>
            <a href={`/jobs/${j.id}/overview`}>{j.company} — {j.role_title}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
