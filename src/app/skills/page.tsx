"use client";

import { useEffect, useState } from "react";
import createSupabaseBrowserClient from "@/core/supabase/browser";

type SkillRow = {
  skill_id: string;
  estimated_level: number;
  confidence: number;
  evidence_count: number;
  months_experience?: number;
};

const LEVEL_BANDS = [
  { min: 0, max: 1, label: "L1 Intro", desc: "Knows names, not yet applied." },
  { min: 1, max: 2, label: "L2 Vocabulary", desc: "Can follow examples with guidance." },
  { min: 2, max: 3, label: "L3 Basics", desc: "Implements simple cases from templates." },
  { min: 3, max: 4, label: "L4 Working", desc: "Solves straightforward problems solo." },
  { min: 4, max: 5, label: "L5 Solid", desc: "Applies core patterns correctly." },
  { min: 5, max: 6, label: "L6 Confident", desc: "Handles edge cases, explains tradeoffs." },
  { min: 6, max: 7, label: "L7 Advanced", desc: "Optimizes solutions, adapts patterns." },
  { min: 7, max: 8, label: "L8 Strong", desc: "Designs new variations, guides peers." },
  { min: 8, max: 9, label: "L9 Expert", desc: "Solves hard/novel problems quickly." },
  { min: 9, max: 10, label: "L10 Specialist", desc: "Deep expertise; mentors and architects." },
];

function bandFor(level: number) {
  return LEVEL_BANDS.find((b) => level >= b.min && level < b.max) ?? LEVEL_BANDS[LEVEL_BANDS.length - 1];
}

export default function SkillsPage() {
  const [items, setItems] = useState<SkillRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [evidence, setEvidence] = useState("");
  const [level, setLevel] = useState(5);
  const [months, setMonths] = useState(0);
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
      body: JSON.stringify({
        skill_name: name,
        description: desc,
        evidence,
        level,
        months_experience: months,
      }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setError(json?.error ?? "Add failed");
      return;
    }
    setSuccess(`Saved evidence for ${json.skill_id}`);
    setName("");
    setDesc("");
    setLevel(5);
    setEvidence("");
    setMonths(0);
    await load();
  }

  return (
    <div className="page" style={{ display: "grid", gap: 16 }}>
      <div className="section-title">
        <h1 style={{ margin: 0 }}>Skills</h1>
        <a className="ghost-link" href="/cv">Sync from CV</a>
      </div>
      <div className="card">
        <form onSubmit={addSkill} className="grid">
          <div className="section-title">
            <h3 style={{ margin: 0 }}>Add / claim a skill</h3>
            {success && <span className="pill">Updated</span>}
          </div>
          {error && <div style={{ color: "#b91c1c" }}>{error}</div>}
          <input placeholder="Skill name" value={name} onChange={(e) => setName(e.target.value)} required />
          <textarea
            placeholder="Explain how you earned this skill (projects, courses, problems solved, etc.)"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={3}
            required
          />
          <textarea
            placeholder="Where does this show up? (e.g., project link, CV bullet, transcript line)"
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            rows={2}
            required
          />
          <label>
            Estimated level (0-10)
            <input type="number" min={0} max={10} value={level} onChange={(e) => setLevel(Number(e.target.value))} />
          </label>
          <label>
            Experience (months)
            <input type="number" min={0} max={600} value={months} onChange={(e) => setMonths(Number(e.target.value))} />
          </label>
          <button type="submit" className="primary">Save evidence</button>
        </form>
      </div>

      <div className="card">
        <div className="section-title">
          <h3 style={{ margin: 0 }}>Your skill state</h3>
          <div className="pill">Ranges show realistic bands (not single points)</div>
        </div>
        <table className="pro">
          <thead>
            <tr>
              <th>Skill</th>
              <th>Range</th>
              <th>Band / Description</th>
              <th>Experience</th>
              <th>Evidence</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => {
              const band = bandFor(s.estimated_level);
              const lower = Math.max(0, s.estimated_level - 0.5).toFixed(1);
              const upper = Math.min(10, s.estimated_level + 0.5).toFixed(1);
              const support = s.evidence_count >= 5 ? "Strong" : s.evidence_count >= 2 ? "Moderate" : "Light";
              const warnHidden = s.evidence_count === 0 ? "⚠️ CV’de belirtilmemiş olabilir" : "";
              const expDisplay = s.months_experience && s.months_experience > 0 ? `${s.months_experience} mo` : "N/A";
              return (
                <tr key={s.skill_id}>
                  <td style={{ fontWeight: 600 }}>{s.skill_id}</td>
                  <td>{lower} – {upper}</td>
                  <td>
                    <div style={{ display: "grid", gap: 2 }}>
                      <span className="pill">{band.label}</span>
                      <small style={{ color: "#475569" }}>{band.desc}</small>
                    </div>
                  </td>
                  <td>{expDisplay}</td>
                  <td>{support} ({s.evidence_count} evidence) {warnHidden}</td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={4}>No skills yet. Add evidence above or sync from CV.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
