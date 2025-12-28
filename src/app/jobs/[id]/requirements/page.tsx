"use client";

import { useEffect, useMemo, useState } from "react";
import createSupabaseBrowserClient from "@/core/supabase/browser";

type Requirement = {
  id: string;
  skill_id: string;
  required_level: number;
  importance: number;
  required_months_experience?: number;
  strictness?: "mandatory" | "preferred" | "nice_to_have" | null;
};
type SkillOption = { id: string; name: string };

export default function JobRequirementsPage({ params }: { params: { id: string } }) {
  const [items, setItems] = useState<Requirement[]>([]);
  const [skills, setSkills] = useState<SkillOption[]>([]);
  const [skillId, setSkillId] = useState("");
  const [level, setLevel] = useState(5);
  const [importance, setImportance] = useState(3);
  const [months, setMonths] = useState(0);
  const [strictness, setStrictness] = useState<"mandatory" | "preferred" | "nice_to_have">("preferred");
  const [error, setError] = useState<string | null>(null);

  const skillNames = useMemo(() => {
    const map = new Map(skills.map((s) => [s.id, s.name]));
    return map;
  }, [skills]);

  async function load() {
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    const res = await fetch(`/api/jobs/${params.id}/requirements`, {
      cache: "no-store",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setError(json?.error ?? "Failed to load");
      return;
    }
    setItems(json.items ?? []);
  }

  async function loadSkills(search = "") {
    const supabase = createSupabaseBrowserClient();
    const db = supabase
      .from("skills")
      .select("id,name")
      .order("name", { ascending: true })
      .limit(30);
    const { data, error } = search ? await db.ilike("name", `%${search}%`) : await db;
    if (!error && data) setSkills(data as any);
  }

  useEffect(() => {
    load();
    loadSkills();
  }, [params.id]);

  async function addRequirement(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    const res = await fetch(`/api/jobs/${params.id}/requirements`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        skill_id: skillId,
        required_level: level,
        importance,
        required_months_experience: months,
        strictness,
      }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setError(json?.error ?? "Create failed");
      return;
    }
    setSkillId("");
    await load();
  }

  async function autoExtract() {
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    const res = await fetch(`/api/jobs/${params.id}/requirements/extract`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setError(json?.error ?? "Extraction failed");
      return;
    }
    await load();
  }

  async function deleteReq(id: string) {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    const res = await fetch(`/api/jobs/${params.id}/requirements?reqId=${id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      setError("Delete failed");
      return;
    }
    await load();
  }

  async function updateReq(
    id: string,
    field: "required_level" | "importance" | "required_months_experience" | "strictness",
    value: number | string
  ) {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    const res = await fetch(`/api/jobs/${params.id}/requirements`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ id, [field]: value }),
    });
    if (!res.ok) {
      setError("Update failed");
      return;
    }
    await load();
  }

  return (
    <div className="page" style={{ display: "grid", gap: 12 }}>
      <div className="section-title">
        <div>
          <h1 style={{ margin: 0 }}>Job Requirements</h1>
          <div style={{ color: "#475569" }}>Add requirements or auto-extract from the job description.</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a className="ghost-link" href={`/jobs/${params.id}/overview`}>Overview</a>
          <a className="ghost-link" href="/jobs">All Jobs</a>
        </div>
      </div>

      {error && <div className="card" style={{ color: "#b91c1c" }}>{error}</div>}

      <div className="card">
        <div className="section-title">
          <h3 style={{ margin: 0 }}>Add requirement</h3>
          <button type="button" className="ghost-link" onClick={autoExtract}>AI extract from JD</button>
        </div>
        <form onSubmit={addRequirement} className="grid">
          <label>
            Skill
            <input
              list="skill-options"
              value={skillId}
              onChange={(e) => setSkillId(e.target.value)}
              placeholder="Search skill id"
              required
            />
            <datalist id="skill-options">
              {skills.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </datalist>
          </label>
          <label>
            Required level (0-10)
            <input
              type="number"
              min={0}
              max={10}
              value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
              required
            />
          </label>
          <label>
            Importance (1-5)
            <input
              type="number"
              min={1}
              max={5}
              value={importance}
              onChange={(e) => setImportance(Number(e.target.value))}
              required
            />
          </label>
          <label>
            Required experience (months)
            <input
              type="number"
              min={0}
              max={600}
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
            />
          </label>
          <label>
            Strictness
            <select value={strictness} onChange={(e) => setStrictness(e.target.value as any)}>
              <option value="mandatory">Mandatory</option>
              <option value="preferred">Preferred</option>
              <option value="nice_to_have">Nice to have</option>
            </select>
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="primary">Add requirement</button>
            <button type="button" className="ghost-link" onClick={() => loadSkills(skillId)}>Search skill</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3 style={{ margin: "6px 0" }}>Current requirements</h3>
        <table className="pro">
          <thead>
            <tr>
              <th>Skill</th>
              <th>Required</th>
              <th>Importance</th>
              <th>Experience (months)</th>
              <th>Strictness</th>
              <th>Ideal</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => {
              const ideal = Math.min(10, r.required_level + 2);
              return (
                <tr key={r.id}>
                  <td>{skillNames.get(r.skill_id) ?? r.skill_id}</td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={r.required_level}
                      onChange={(e) => updateReq(r.id, "required_level", Number(e.target.value))}
                      style={{ width: 80 }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={r.importance}
                      onChange={(e) => updateReq(r.id, "importance", Number(e.target.value))}
                      style={{ width: 80 }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      max={600}
                      value={r.required_months_experience ?? 0}
                      onChange={(e) => updateReq(r.id, "required_months_experience", Number(e.target.value))}
                      style={{ width: 100 }}
                    />
                  </td>
                  <td>
                    <select
                      value={r.strictness ?? "preferred"}
                      onChange={(e) => updateReq(r.id, "strictness", e.target.value)}
                    >
                      <option value="mandatory">Mandatory</option>
                      <option value="preferred">Preferred</option>
                      <option value="nice_to_have">Nice to have</option>
                    </select>
                  </td>
                  <td>{ideal}</td>
                  <td>
                    <button type="button" className="ghost-link" onClick={() => deleteReq(r.id)}>Delete</button>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={5}>No requirements yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
