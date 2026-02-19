"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Optional: if already logged in, send to dashboard
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      if (data.session) {
        router.replace("/dashboard");
      }
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setBusy(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Log in</h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <label>
          Email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            autoComplete="email"
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
            autoComplete="current-password"
            style={{ width: "100%", padding: 10, marginTop: 6 }}
          />
        </label>

        <button type="submit" disabled={busy} style={{ padding: 10 }}>
          {busy ? "Signing in..." : "Log in"}
        </button>

        {msg && <p style={{ color: "crimson" }}>{msg}</p>}

        <p style={{ marginTop: 8 }}>
          Need an account? <Link href="/signup">Sign up</Link>
        </p>
      </form>
    </main>
  );
}
