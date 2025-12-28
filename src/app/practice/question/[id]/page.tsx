"use client";

import { useEffect, useState } from "react";
import createSupabaseBrowserClient from "@/core/supabase/browser";
import { Loader } from "@/app/components/loader";

type Question = {
  id: string;
  title: string;
  difficulty_weight: number;
  estimated_minutes: number;
  skill_ids: string[];
};

export default function QuestionPage({ params }: { params: { id: string } }) {
  const [item, setItem] = useState<Question | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const res = await fetch(`/api/practice/questions/${params.id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setError(json?.error ?? "Failed to load");
      setLoading(false);
      return;
    }
    setItem(json.item);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [params.id]);

  if (loading) {
    return (
      <div className="page">
        <Loader label="Loading question..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="card">
          <h1>Question</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="page">
        <Loader label="Loading question..." />
      </div>
    );
  }

  return (
    <div className="page" style={{ display: "grid", gap: 12 }}>
      <div className="section-title">
        <div>
          <h1 style={{ margin: 0 }}>{item.title}</h1>
          <div style={{ color: "#475569" }}>Target skills: {(item.skill_ids ?? []).join(", ")}</div>
        </div>
        <div className="pill">Diff {item.difficulty_weight} • {item.estimated_minutes} min</div>
      </div>

      <div className="card">
        <p style={{ margin: 0, fontWeight: 600 }}>Practice prompt</p>
        <p style={{ margin: "6px 0" }}>
          Solve and outline approach, time/space complexity, and key test cases. Self-evaluate before checking solutions.
        </p>
      </div>

      <AttemptForm questionId={item.id} />
    </div>
  );
}

function AttemptForm({ questionId }: { questionId: string }) {
  const [solved, setSolved] = useState(false);
  const [timeSpent, setTimeSpent] = useState(30);
  const [hints, setHints] = useState(0);
  const [perceived, setPerceived] = useState(5);
  const [confidence, setConfidence] = useState(3);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    const res = await fetch("/api/practice/attempts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        question_id: questionId,
        solved,
        time_spent_minutes: timeSpent,
        hints_used: hints,
        perceived_difficulty: perceived,
        confidence_rating: confidence,
        notes,
      }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setError(json?.error ?? "Submit failed");
      setLoading(false);
      return;
    }
    setSuccess("Attempt saved. Skill updates applied.");
    setLoading(false);
  }

  return (
    <form onSubmit={submit} className="card" style={{ display: "grid", gap: 8, maxWidth: 700 }}>
      <h3>Log attempt</h3>
      {error && <p>{error}</p>}
      {success && <p>{success}</p>}

      <label>
        Solved?
        <input type="checkbox" checked={solved} onChange={(e) => setSolved(e.target.checked)} />
      </label>

      <label>
        Time spent (minutes)
        <input type="number" min={1} max={300} value={timeSpent} onChange={(e) => setTimeSpent(Number(e.target.value))} />
      </label>

      <label>
        Hints used (0-2)
        <input type="number" min={0} max={2} value={hints} onChange={(e) => setHints(Number(e.target.value))} />
      </label>

      <label>
        Perceived difficulty (1-10)
        <input type="number" min={1} max={10} value={perceived} onChange={(e) => setPerceived(Number(e.target.value))} />
      </label>

      <label>
        Confidence rating (1-5)
        <input
          type="number"
          min={1}
          max={5}
          value={confidence}
          onChange={(e) => setConfidence(Number(e.target.value))}
        />
      </label>

      <label>
        Notes
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
      </label>

      <button type="submit" className="primary" disabled={loading}>
        {loading ? "Saving..." : "Submit attempt"}
      </button>
    </form>
  );
}
