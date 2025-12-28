"use client";

import { useEffect, useState } from "react";
import createSupabaseBrowserClient from "@/core/supabase/browser";

type SkillRow = { skill_id: string; estimated_level: number; confidence: number; evidence_count: number };

export default function SkillsPage() {
  const [items, setItems] = useState<SkillRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    const res = await fetch("/api/skills", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setError(json?.error ?? "Failed to load");
      return;
    }
    setItems(json.items ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h1>Skills</h1>
      {error && <p>{error}</p>}
      <table cellPadding={8} style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">Skill</th>
            <th align="left">Level</th>
            <th align="left">Confidence</th>
            <th align="left">Evidence</th>
          </tr>
        </thead>
        <tbody>
          {items.map((s) => (
            <tr key={s.skill_id} style={{ borderTop: "1px solid #ddd" }}>
              <td>{s.skill_id}</td>
              <td>{s.estimated_level.toFixed(1)}</td>
              <td>{(s.confidence * 100).toFixed(0)}%</td>
              <td>{s.evidence_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
