"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";

export function SignupForm() {
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
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    setBusy(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Account created. If email confirmation is enabled in Supabase, confirm your address before signing in.");
    router.push("/login");
  }

  return (
    <form className="field-grid" onSubmit={handleSubmit}>
      <label className="field-label">
        Work email
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
          minLength={8}
          autoComplete="new-password"
          required
        />
      </label>

      <button className="button-primary" disabled={busy} type="submit">
        {busy ? "Creating account..." : "Create account"}
      </button>

      {message ? (
        <div className={`message ${message.startsWith("Account created") ? "message-success" : "message-error"}`}>
          {message}
        </div>
      ) : null}

      <p className="text-muted" style={{ margin: 0 }}>
        Already registered? <Link href="/login">Sign in</Link>
      </p>
    </form>
  );
}
