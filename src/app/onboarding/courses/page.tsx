"use client";

import { useState } from "react";
import createSupabaseBrowserClient from "@/core/supabase/browser";

type AddedCourse = { id: string; code: string; name: string };

export default function OnboardingCoursesPage() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [term, setTerm] = useState("");
  const [courseKey, setCourseKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<AddedCourse[]>([]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    const res = await fetch("/api/onboarding/courses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ code, name, term, course_key: courseKey }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setError(json?.error ?? "Save failed");
      return;
    }
    setAdded((prev) => [...prev, { id: json.id, code, name }]);
    setCode("");
    setName("");
    setTerm("");
    setCourseKey("");
  }

  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      <h1>Onboarding: Courses</h1>
      {error && <p>{error}</p>}
      <form onSubmit={submit} style={{ display: "grid", gap: 8, maxWidth: 520 }}>
        <input placeholder="Course code" value={code} onChange={(e) => setCode(e.target.value)} required />
        <input placeholder="Course name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input placeholder="Term" value={term} onChange={(e) => setTerm(e.target.value)} />
        <input placeholder="Course key (DSA, OS, DB... optional)" value={courseKey} onChange={(e) => setCourseKey(e.target.value)} />
        <button type="submit">Add course</button>
      </form>

      {added.length > 0 && (
        <div>
          <h3>Added</h3>
          <ul>
            {added.map((c) => (
              <li key={c.id}>{c.code} — {c.name}</li>
            ))}
          </ul>
        </div>
      )}

      <a href="/onboarding/jobs">Next: Jobs</a>
    </div>
  );
}
