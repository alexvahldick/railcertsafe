"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    const supabase = getBrowserSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setBusy(false);
      setMessage(error.message);
      return;
    }

    const sessionResponse = await fetch("/api/auth/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ accessToken: data.session.access_token }),
    });

    if (!sessionResponse.ok) {
      const payload = (await sessionResponse.json().catch(() => null)) as { error?: string } | null;
      setBusy(false);
      setMessage(payload?.error ?? "Could not establish a secure session.");
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form className="field-grid" onSubmit={handleSubmit}>
      <label className="field-label">
        Email
        <input
          className="field-input"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
      </label>

      <label className="field-label">
        Password
        <input
          className="field-input"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />
      </label>

      <button className="button-primary" disabled={busy} type="submit">
        {busy ? "Signing in..." : "Sign in"}
      </button>

      {message ? <div className="message message-error">{message}</div> : null}

      <p className="text-muted" style={{ margin: 0 }}>
        Need an account? <Link href="/signup">Create one</Link>
      </p>
    </form>
  );
}
