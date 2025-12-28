"use client";

import { useEffect, useMemo, useState } from "react";
import createSupabaseBrowserClient from "@/core/supabase/browser";

type Requirement = { id: string; skill_id: string; required_level: number; importance: number };
type SkillOption = { id: string; name: string };

export default function JobRequirementsPage({ params }: { params: { id: string } }) {
  const [items, setItems] = useState<Requirement[]>([]);
  const [skills, setSkills] = useState<SkillOption[]>([]);
  const [skillId, setSkillId] = useState("");
  const [level, setLevel] = useState(5);
  const [importance, setImportance] = useState(3);
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

  async function updateReq(id: string, field: "required_level" | "importance", value: number) {
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
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      <div>
        <h1>Job Requirements</h1>
        <div style={{ margin: "8px 0" }}>
          <a href={`/jobs/${params.id}/overview`}>Overview</a>{" | "}
          <a href={`/jobs/${params.id}/requirements`}>Requirements</a>{" | "}
          <a href="/jobs">All Jobs</a>
        </div>
      </div>

      {error && <p>{error}</p>}

      <form onSubmit={addRequirement} style={{ display: "grid", gap: 8, maxWidth: 500 }}>
        <label>
          Skill
          <input
            list="skill-options"
            value={skillId}
            onChange={(e) => setSkillId(e.target.value)}
            placeholder="skill id (search)"
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
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit">Add requirement</button>
          <button type="button" onClick={() => loadSkills(skillId)}>Search skill name</button>
        </div>
      </form>

      <table cellPadding={8} style={{ borderCollapse: "collapse", maxWidth: 800 }}>
        <thead>
          <tr>
            <th align="left">Skill</th>
            <th align="left">Required level</th>
            <th align="left">Importance</th>
            <th align="left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((r) => (
            <tr key={r.id} style={{ borderTop: "1px solid #ddd" }}>
              <td>{skillNames.get(r.skill_id) ?? r.skill_id}</td>
              <td>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={r.required_level}
                  onChange={(e) => updateReq(r.id, "required_level", Number(e.target.value))}
                  style={{ width: 60 }}
                />
              </td>
              <td>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={r.importance}
                  onChange={(e) => updateReq(r.id, "importance", Number(e.target.value))}
                  style={{ width: 60 }}
                />
              </td>
              <td>
                <button type="button" onClick={() => deleteReq(r.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
