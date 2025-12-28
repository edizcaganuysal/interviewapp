"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/core/supabase/browser";

export default function ForgotPasswordPage() {
  const supabase = createSupabaseBrowserClient();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/login",
    });

    setDone(true);
  }

  return (
    <form onSubmit={onSubmit}>
      <h1>Reset Password</h1>

      {done ? (
        <p>Check your email.</p>
      ) : (
        <>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit">Send reset link</button>
        </>
      )}
    </form>
  );
}
