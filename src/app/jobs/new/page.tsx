"use client";

import { useState } from "react";
import createSupabaseBrowserClient from "@/core/supabase/browser";

export default function NewJobPage() {
  const [company, setCompany] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
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
        role_title: roleTitle,
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

    window.location.href = `/jobs/${json.id}/overview`;
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>New Job</h1>

      {error && <p>{error}</p>}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 8, maxWidth: 520 }}>
        <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" required />
        <input value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} placeholder="Role title" required />
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="JD text" rows={8} required />
        <button type="submit">Create</button>
      </form>
    </div>
  );
}
