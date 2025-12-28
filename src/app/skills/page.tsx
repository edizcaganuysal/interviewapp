"use client";

import { useEffect, useState } from "react";
import createSupabaseBrowserClient from "@/core/supabase/browser";

type SkillRow = { skill_id: string; estimated_level: number; confidence: number; evidence_count: number };

export default function SkillsPage() {
  const [items, setItems] = useState<SkillRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [level, setLevel] = useState(5);
  const [success, setSuccess] = useState<string | null>(null);

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

  async function addSkill(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    const res = await fetch("/api/skills/custom", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ skill_name: name, description: desc, level }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setError(json?.error ?? "Add failed");
      return;
    }
    setSuccess(`Added/updated skill ${json.skill_id}`);
    setName("");
    setDesc("");
    setLevel(5);
    await load();
  }

  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      <h1>Skills</h1>
      <p>View your skill state and add your own skills with evidence (not limited to attempts).</p>

      <form onSubmit={addSkill} style={{ display: "grid", gap: 8, maxWidth: 640, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
        <h3>Add / claim a skill</h3>
        {error && <p>{error}</p>}
        {success && <p>{success}</p>}
        <input placeholder="Skill name" value={name} onChange={(e) => setName(e.target.value)} required />
        <textarea
          placeholder="Explain how you earned this skill (projects, courses, problems solved, etc.)"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={4}
          required
        />
        <label>
          Estimated level (0-10)
          <input type="number" min={0} max={10} value={level} onChange={(e) => setLevel(Number(e.target.value))} />
        </label>
        <button type="submit">Save skill evidence</button>
      </form>

      <h3>Your skill state</h3>
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
