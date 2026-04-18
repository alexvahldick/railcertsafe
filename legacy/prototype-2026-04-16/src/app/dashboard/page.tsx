"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

function normalizeEmail(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function isAdminEmail(email: string | null) {
  const current = normalizeEmail(email);
  if (!current) return false;

  // Comma-separated allowlist, e.g. "alex@example.com,other@example.com"
  const raw = process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "";
  const allow = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  return allow.includes(current);
}

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const admin = useMemo(() => isAdminEmail(email), [email]);

  useEffect(() => {
    let mounted = true;

    (async () => {
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

  const shellStyle: React.CSSProperties = {
    minHeight: "100vh",
    background: "#f6f7fb",
    color: "#111",
    padding: 16,
  };

  const cardStyle: React.CSSProperties = {
    maxWidth: 900,
    margin: "40px auto",
    padding: 20,
    background: "#fff",
    border: "1px solid #e6e8ef",
    borderRadius: 12,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  };

  const buttonStyle: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #1f2937",
    background: "#111827",
    color: "#fff",
    cursor: "pointer",
    textAlign: "center",
  };

  const secondaryButtonStyle: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #cfd6e4",
    background: "#fff",
    color: "#111",
    cursor: "pointer",
    textAlign: "center",
  };

  const linkButton = (href: string) => () => router.push(href);

  if (busy) {
    return (
      <main style={shellStyle}>
        <div style={cardStyle}>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Dashboard</h1>
          <p style={{ marginTop: 10 }}>Loading…</p>
          {msg && <p style={{ color: "crimson", marginTop: 10 }}>{msg}</p>}
        </div>
      </main>
    );
  }

  return (
    <main style={shellStyle}>
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Dashboard</h1>

          <button onClick={logout} style={secondaryButtonStyle}>
            Log out
          </button>
        </div>

        <p style={{ marginTop: 12, color: "#374151" }}>
          Signed in as: <strong style={{ color: "#111" }}>{email ?? "Unknown"}</strong>
        </p>

        <p style={{ marginTop: 12, color: "#374151" }}>
          Intake is working end-to-end. Next is extraction scaffolding.
        </p>

        {/* Quick Actions */}
        <section style={{ marginTop: 18 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Quick Actions</h2>

          <div style={{ marginTop: 10, display: "grid", gap: 10, maxWidth: 420 }}>
            <button onClick={linkButton("/upload")} style={buttonStyle}>
              Upload a document
            </button>

            {admin && (
              <button onClick={linkButton("/admin/intake")} style={buttonStyle}>
                Admin intake queue
              </button>
            )}
          </div>

          {!admin && (
            <p style={{ marginTop: 10, color: "#6b7280", fontSize: 12 }}>
              Admin tools are hidden unless your email is in NEXT_PUBLIC_ADMIN_EMAILS.
            </p>
          )}
        </section>

        {msg && <p style={{ color: "crimson", marginTop: 12 }}>{msg}</p>}
      </div>
    </main>
  );
}