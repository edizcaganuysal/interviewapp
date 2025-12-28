"use client";

import { useEffect, useState } from "react";
import createSupabaseBrowserClient from "@/core/supabase/browser";

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

  async function load() {
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const res = await fetch("/api/practice/today", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
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
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      <h1>Today&apos;s Practice (2 questions)</h1>
      {error && <p>{error}</p>}
      <ul>
        {items.map((q) => (
          <li key={q.id}>
            <a href={`/practice/question/${q.id}`}>{q.title}</a> — diff {q.difficulty_weight} — {q.estimated_minutes} min
          </li>
        ))}
      </ul>
    </div>
  );
}
