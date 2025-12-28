"use client";

import { useEffect, useMemo, useState } from "react";

type QuestionRow = {
  id: string;
  title: string;
  difficulty_weight: number;
  estimated_minutes: number;
  is_mock: boolean;
  skill_ids: string[];
};

export default function AdminQuestionsPage() {
  const [items, setItems] = useState<QuestionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);

  const [pageSize, setPageSize] = useState(20);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState(1);
  const [minutes, setMinutes] = useState(30);
  const [skills, setSkills] = useState("dsa.arrays");

  const skillIds = useMemo(
    () => skills.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 3),
    [skills]
  );

  async function load(nextPage: number, nextPageSize: number) {
    setError(null);

    const params = new URLSearchParams();
    params.set("page", String(nextPage));
    params.set("pageSize", String(nextPageSize));

    const res = await fetch(`/api/admin/questions?${params.toString()}`, { cache: "no-store" });
    if (!res.ok) {
      setError("Failed to load");
      return;
    }

    const data = await res.json();
    setItems(data.items);
    setTotal(data.total);
    setTotalPages(data.totalPages);
    setPage(data.page);
  }

  useEffect(() => {
    load(1, pageSize);
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const res = await fetch("/api/admin/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        difficulty_weight: difficulty,
        estimated_minutes: minutes,
        skill_ids: skillIds,
        url: null,
        is_mock: true,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Create failed");
      return;
    }

    setTitle("");
    await load(page, pageSize);
  }

  async function onDelete(id: string) {
    setError(null);
    const res = await fetch(`/api/admin/questions/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Delete failed");
      return;
    }
    await load(page, pageSize);
  }

  async function onQuickEdit(id: string) {
    const newTitle = prompt("New title?");
    if (!newTitle) return;

    setError(null);
    const res = await fetch(`/api/admin/questions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    });

    if (!res.ok) {
      setError("Update failed");
      return;
    }

    await load(page, pageSize);
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Admin Questions</h1>

      <div style={{ margin: "8px 0" }}>
        Total: {total} | Page {page} / {totalPages}
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "center" }}>
        <label>
          Page size{" "}
          <select
            value={pageSize}
            onChange={async (e) => {
              const nextSize = Number(e.target.value);
              setPageSize(nextSize);
              await load(1, nextSize);
            }}
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </label>

        <button type="button" disabled={page <= 1} onClick={() => load(page - 1, pageSize)}>
          Prev
        </button>

        <button type="button" disabled={page >= totalPages} onClick={() => load(page + 1, pageSize)}>
          Next
        </button>
      </div>

      <form onSubmit={onCreate} style={{ display: "grid", gap: 8, maxWidth: 520, marginBottom: 16 }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required />
        <input
          type="number"
          value={difficulty}
          min={1}
          max={3}
          onChange={(e) => setDifficulty(Number(e.target.value))}
          required
        />
        <input
          type="number"
          value={minutes}
          min={5}
          max={180}
          onChange={(e) => setMinutes(Number(e.target.value))}
          required
        />
        <input
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
          placeholder='skill_ids comma-separated (max 3). Example: "dsa.arrays,dsa.hashing"'
          required
        />
        <button type="submit">Create</button>
      </form>

      {error && <p>{error}</p>}

      <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th align="left">Title</th>
            <th align="left">Diff</th>
            <th align="left">Min</th>
            <th align="left">Skills</th>
            <th align="left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((q) => (
            <tr key={q.id} style={{ borderTop: "1px solid #ddd" }}>
              <td>{q.title}</td>
              <td>{q.difficulty_weight}</td>
              <td>{q.estimated_minutes}</td>
              <td>{(q.skill_ids ?? []).join(", ")}</td>
              <td>
                <button type="button" onClick={() => onQuickEdit(q.id)}>Edit</button>{" "}
                <button type="button" onClick={() => onDelete(q.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
