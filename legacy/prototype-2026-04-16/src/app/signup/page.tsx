"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";


export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);

    const { error } = await supabase.auth.signUp({ email, password });

    setBusy(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    setMsg("Account created. Check your email if confirmation is required.");
    router.push("/login");
  }

  return (
    <main style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Create account</h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <label>
          Email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            style={{ width: "100%", padding: 10, marginTop: 6 }}
          />
        </label>

        <label>
          Password
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            minLength={8}
            style={{ width: "100%", padding: 10, marginTop: 6 }}
          />
        </label>

        <button disabled={busy} style={{ padding: 10 }}>
          {busy ? "Creating..." : "Sign up"}
        </button>

        {msg && <p>{msg}</p>}

        <p style={{ marginTop: 8 }}>
          Already have an account? <a href="/login">Log in</a>
        </p>
      </form>
    </main>
  );
}
