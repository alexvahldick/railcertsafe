"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      // Check session
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        setMsg(error.message);
        setBusy(false);
        return;
      }

      if (!data.session) {
        router.replace("/login");
        return;
      }

      setEmail(data.session.user.email ?? null);
      setBusy(false);
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  async function logout() {
    setBusy(true);
    setMsg(null);

    const { error } = await supabase.auth.signOut();

    if (error) {
      setMsg(error.message);
      setBusy(false);
      return;
    }

    router.replace("/login");
  }

  if (busy) {
    return (
      <main style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Dashboard</h1>
        <p>Loading…</p>
        {msg && <p style={{ color: "crimson" }}>{msg}</p>}
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Dashboard</h1>

        <button onClick={logout} style={{ padding: 10 }}>
          Log out
        </button>
      </div>

      <p style={{ marginTop: 12 }}>
        Signed in as: <strong>{email ?? "Unknown"}</strong>
      </p>

      <p style={{ marginTop: 12 }}>If you can reach this after login, we’re making progress.</p>

      {msg && <p style={{ color: "crimson", marginTop: 12 }}>{msg}</p>}
    </main>
  );
}
