"use client";

import { useState } from "react";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Login failed");
      return;
    }

    window.location.href = "/admin/questions";
  }

  return (
    <form style={{ padding: 16, display: "grid", gap: 12, maxWidth: 420 }} onSubmit={onSubmit}>
      <h1>Admin Login</h1>

      <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" required />
      <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" required />

      {error && <p>{error}</p>}
      <button type="submit">Login</button>
    </form>
  );
}
