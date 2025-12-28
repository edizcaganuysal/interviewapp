"use client";

import { useEffect, useState } from "react";
import createSupabaseBrowserClient from "@/core/supabase/browser";
import { Loader } from "@/app/components/loader";

type Question = {
  id: string;
  title: string;
  difficulty_weight: number;
  skill_ids: string[];
  estimated_minutes: number;
};

export default function PracticeTodayPage() {
  const [items, setItems] = useState<Question[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const res = await fetch("/api/practice/today", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setError(json?.error ?? "Failed to load");
      setLoading(false);
      return;
    }
    setItems(json.items ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <div className="page"><Loader label="Loading today’s set..." /></div>;

  return (
    <div className="page" style={{ display: "grid", gap: 12 }}>
      <div className="section-title">
        <div>
          <h1 style={{ margin: 0 }}>Today&apos;s Practice</h1>
          <div style={{ color: "#475569" }}>Two questions tailored to top gaps.</div>
        </div>
        <a className="ghost-link" href="/practice/history">History</a>
      </div>
      {error && <div className="card" style={{ color: "#b91c1c" }}>{error}</div>}
      <div className="card" style={{ display: "grid", gap: 12 }}>
        {items.map((q) => (
          <div key={q.id} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 }}>
            <div className="section-title">
              <div>
                <a href={`/practice/question/${q.id}`} style={{ fontWeight: 700 }}>{q.title}</a>
                <div style={{ color: "#475569" }}>Skills: {(q.skill_ids ?? []).join(", ")}</div>
              </div>
              <div className="pill">Diff {q.difficulty_weight} • {q.estimated_minutes} min</div>
            </div>
            <a className="primary-link" href={`/practice/question/${q.id}`}>Open</a>
          </div>
        ))}
        {items.length === 0 && <div>No questions available.</div>}
      </div>
    </div>
  );
}
