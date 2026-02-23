"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type DocRow = {
  id: string;
  created_at: string;
  uploaded_by: string;
  doc_type: string;
  storage_path: string;
  original_filename: string;
  status: string;
  notes: string | null;
};

const ALLOWED_STATUSES = ["received", "extracting", "needs_review", "processed", "rejected"] as const;
type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

function normalizeEmail(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function isAdminEmail(email: string | null) {
  const current = normalizeEmail(email);
  if (!current) return false;

  const raw = process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "";
  const allow = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  return allow.includes(current);
}

export default function AdminIntakePage() {
  const router = useRouter();
  const [busy, setBusy] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [email, setEmail] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const [rows, setRows] = useState<DocRow[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDocType, setFilterDocType] = useState<string>("");

  const [savingId, setSavingId] = useState<string | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  const admin = useMemo(() => isAdminEmail(email), [email]);

  // Styles (explicit colors to avoid invisible controls on dark backgrounds)
  const shellStyle: React.CSSProperties = {
    minHeight: "100vh",
    background: "#f6f7fb",
    color: "#111",
    padding: 16,
  };

  const cardStyle: React.CSSProperties = {
    maxWidth: 1100,
    margin: "40px auto",
    padding: 20,
    background: "#fff",
    border: "1px solid #e6e8ef",
    borderRadius: 12,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  };

  const inputStyle: React.CSSProperties = {
    padding: 10,
    border: "1px solid #cfd6e4",
    borderRadius: 8,
    background: "#fff",
    color: "#111",
    outline: "none",
  };

  // Some browsers ignore option styling, but setting select colors still fixes most cases.
  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    WebkitAppearance: "menulist",
    appearance: "menulist",
  };

  const optionStyle: React.CSSProperties = {
    background: "#fff",
    color: "#111",
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

  const loadDocs = useCallback(
    async (accessToken: string) => {
      setMsg(null);

      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (filterDocType.trim()) params.set("doc_type", filterDocType.trim());

      const res = await fetch(`/api/admin/documents?${params.toString()}`, {
        method: "GET",
        headers: { authorization: `Bearer ${accessToken}` },
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRows([]);
        setMsg(json?.error ?? `Failed to load documents (${res.status})`);
        return;
      }

      setRows(json?.data ?? []);
    },
    [filterStatus, filterDocType]
  );

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

      const userEmail = data.session.user.email ?? null;
      setEmail(userEmail);

      if (!isAdminEmail(userEmail)) {
        setBusy(false);
        setMsg("Forbidden: your email is not in NEXT_PUBLIC_ADMIN_EMAILS.");
        return;
      }

      const accessToken = data.session.access_token;
      setToken(accessToken);

      await loadDocs(accessToken);
      setBusy(false);
    })();

    return () => {
      mounted = false;
    };
  }, [router, loadDocs]);

  async function refresh() {
    if (!token) return;
    setBusy(true);
    await loadDocs(token);
    setBusy(false);
  }

  async function updateRow(id: string, nextStatus: AllowedStatus, notes: string | null) {
    if (!token) return;

    setSavingId(id);
    setMsg(null);

    const res = await fetch(`/api/admin/documents`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id, status: nextStatus, notes }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(json?.error ?? `Update failed (${res.status})`);
      setSavingId(null);
      return;
    }

    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: nextStatus, notes } : r)));
    setSavingId(null);
  }

  async function saveNotesOnly(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const status = (ALLOWED_STATUSES.includes(row.status as AllowedStatus)
      ? (row.status as AllowedStatus)
      : "received") as AllowedStatus;

    await updateRow(id, status, row.notes ?? null);
  }

  async function openSignedUrl(storagePath: string, id: string) {
    if (!token) return;

    setPreviewingId(id);
    setMsg(null);

    const res = await fetch(`/api/admin/documents/signed-url`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ storage_path: storagePath }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(json?.error ?? `Failed to create signed URL (${res.status})`);
      setPreviewingId(null);
      return;
    }

    const url = json?.url as string | undefined;
    if (!url) {
      setMsg("Signed URL response missing url.");
      setPreviewingId(null);
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
    setPreviewingId(null);
  }

  async function logout() {
    setBusy(true);
    setMsg(null);
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (busy) {
    return (
      <main style={shellStyle}>
        <div style={cardStyle}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Admin intake</h1>
          <p style={{ marginTop: 10 }}>Loading…</p>
          {msg && <p style={{ marginTop: 10, color: "crimson" }}>{msg}</p>}
        </div>
      </main>
    );
  }

  if (!admin) {
    return (
      <main style={shellStyle}>
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Admin intake</h1>
            <button onClick={logout} style={secondaryButtonStyle}>
              Log out
            </button>
          </div>

          <p style={{ marginTop: 12, color: "crimson" }}>{msg ?? "Forbidden: admin access required."}</p>

          <button onClick={() => router.push("/dashboard")} style={{ ...buttonStyle, marginTop: 12, maxWidth: 220 }}>
            Back to dashboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={shellStyle}>
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Admin intake</h1>
            <p style={{ marginTop: 8, color: "#374151" }}>
              Signed in as: <strong style={{ color: "#111" }}>{email ?? "Unknown"}</strong>
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => router.push("/dashboard")} style={secondaryButtonStyle}>
              Dashboard
            </button>
            <button onClick={refresh} style={secondaryButtonStyle}>
              Refresh
            </button>
            <button onClick={logout} style={secondaryButtonStyle}>
              Log out
            </button>
          </div>
        </div>

        {/* Filters */}
        <section style={{ marginTop: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Queue filters</h2>

          <div style={{ marginTop: 10, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
            <label style={{ display: "grid", gap: 6, minWidth: 240 }}>
              <span style={{ fontWeight: 700 }}>Status</span>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={selectStyle}>
                <option value="all" style={optionStyle}>
                  all
                </option>
                {ALLOWED_STATUSES.map((s) => (
                  <option key={s} value={s} style={optionStyle}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6, minWidth: 280 }}>
              <span style={{ fontWeight: 700 }}>Document type</span>
              <input
                value={filterDocType}
                onChange={(e) => setFilterDocType(e.target.value)}
                style={inputStyle}
                placeholder="optional exact match (e.g., ops_test)"
              />
            </label>

            <button onClick={() => token && loadDocs(token)} style={{ ...buttonStyle, height: 44 }}>
              Apply
            </button>

            <button
              onClick={() => {
                setFilterStatus("all");
                setFilterDocType("");
              }}
              style={{ ...secondaryButtonStyle, height: 44 }}
            >
              Clear
            </button>
          </div>
        </section>

        {msg && <p style={{ marginTop: 12, color: "crimson" }}>{msg}</p>}

        {/* List */}
        <section style={{ marginTop: 18 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Documents</h2>

          {rows.length === 0 ? (
            <p style={{ marginTop: 10, color: "#374151" }}>No documents found.</p>
          ) : (
            <div style={{ marginTop: 10, display: "grid", gap: 12 }}>
              {rows.map((r) => (
                <div
                  key={r.id}
                  style={{
                    border: "1px solid #e6e8ef",
                    borderRadius: 12,
                    padding: 14,
                    background: "#fff",
                    display: "grid",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontWeight: 800 }}>{r.original_filename}</div>
                      <div style={{ color: "#374151", marginTop: 4 }}>
                        Type: <strong>{r.doc_type}</strong>
                      </div>
                      <div style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>
                        Uploaded: {new Date(r.created_at).toLocaleString()}
                      </div>
                      <div style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>
                        Path: {r.storage_path}
                      </div>
                      <div style={{ color: "#374151", marginTop: 6 }}>
                        Status: <strong>{r.status}</strong>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, alignItems: "start", flexWrap: "wrap" }}>
                      <button
                        onClick={() => openSignedUrl(r.storage_path, r.id)}
                        style={secondaryButtonStyle}
                        disabled={previewingId === r.id}
                      >
                        {previewingId === r.id ? "Opening…" : "View"}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 10, maxWidth: 560 }}>
                    <label style={{ display: "grid", gap: 6 }}>
                      <span style={{ fontWeight: 700 }}>Update status</span>
                      <select
                        value={ALLOWED_STATUSES.includes(r.status as AllowedStatus) ? (r.status as AllowedStatus) : "received"}
                        onChange={(e) => updateRow(r.id, e.target.value as AllowedStatus, r.notes ?? null)}
                        style={selectStyle}
                        disabled={savingId === r.id}
                      >
                        {ALLOWED_STATUSES.map((s) => (
                          <option key={s} value={s} style={optionStyle}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>
                        Allowed: {ALLOWED_STATUSES.join(", ")}
                      </span>
                    </label>

                    <label style={{ display: "grid", gap: 6 }}>
                      <span style={{ fontWeight: 700 }}>Notes</span>
                      <textarea
                        value={r.notes ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, notes: val } : x)));
                        }}
                        style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
                        placeholder="Admin notes…"
                      />
                    </label>

                    <button onClick={() => saveNotesOnly(r.id)} style={buttonStyle} disabled={savingId === r.id}>
                      {savingId === r.id ? "Saving…" : "Save notes"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}