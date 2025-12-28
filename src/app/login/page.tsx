"use client";

import { useState } from "react";
import createSupabaseBrowserClient from "@/core/supabase/browser";

export default function LoginPage() {
  const supabase = createSupabaseBrowserClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    window.location.href = "/dashboard";
  }

  async function oauth(provider: "google" | "github") {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin + "/dashboard" } });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="card" style={{ maxWidth: 480, margin: "0 auto", display: "grid", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Welcome back</h1>
        <p style={{ margin: 0, color: "#475569" }}>Sign in to InterPrep</p>
        {error && <div style={{ color: "#b91c1c" }}>{error}</div>}
        <form onSubmit={onSubmit} className="grid">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" className="primary" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="ghost-link" onClick={() => oauth("google")} disabled={loading}>Continue with Google</button>
          <button className="ghost-link" onClick={() => oauth("github")} disabled={loading}>GitHub</button>
        </div>
        <a href="/signup" style={{ color: "#0a66c2", fontWeight: 600 }}>Need an account? Sign up</a>
      </div>
    </div>
  );
}
