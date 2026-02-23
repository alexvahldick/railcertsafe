"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type DocRow = {
  id: string;
  created_at: string;
  uploaded_by: string | null;
  doc_type: string | null;
  storage_path: string | null;
  original_filename: string | null;
  status: "received" | "extracting" | "needs_review" | "processed" | "rejected";
  notes: string | null;
};

const STATUS_OPTIONS: DocRow["status"][] = [
  "received",
  "extracting",
  "needs_review",
  "processed",
  "rejected",
];

async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  const token = data.session?.access_token;
  if (!token) throw new Error("Not logged in (missing session token)");
  return token;
}

export default function IntakePage() {
  const router = useRouter();

  const [docs, setDocs] = useState<DocRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filtered = useMemo(() => {
    if (!filterStatus || filterStatus === "all") return docs;
    return docs.filter((d) => d.status === filterStatus);
  }, [docs, filterStatus]);

  async function load() {
    setBusy(true);
    setMsg(null);

    try {
      const token = await getAccessToken();

      const res = await fetch(`/api/admin/documents?status=all`, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load documents");

      setDocs((json.data ?? []) as DocRow[]);
    } catch (e: any) {
      setMsg(e?.message ?? "Failed to load documents");
    } finally {
      setBusy(false);
    }
  }

  async function openSignedUrl(doc: DocRow) {
    setMsg(null);

    if (!doc.storage_path) {
      setMsg("Missing storage_path for this document row (cannot generate signed URL).");
      return;
    }

    try {
      const token = await getAccessToken();

      const res = await fetch("/api/admin/documents/signed-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ path: doc.storage_path }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to create signed URL");

      const url = json.url as string;
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      setMsg(e?.message ?? "Failed to open document");
    }
  }

  async function updateStatus(docId: string, status: DocRow["status"], notes?: string | null) {
    setBusy(true);
    setMsg(null);

    try {
      const token = await getAccessToken();

      const res = await fetch("/api/admin/documents", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: docId,
          status,
          notes: notes ?? null,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to update status");

      setDocs((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, status, notes: notes ?? d.notes ?? null } : d))
      );
    } catch (e: any) {
      setMsg(e?.message ?? "Failed to update status");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={{ maxWidth: 1200, margin: "32px auto", padding: 16, color: "#111" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0, color: "#111" }}>Admin — Intake</h1>
          <p style={{ marginTop: 6, color: "#111", opacity: 0.75 }}>
            Review uploaded documents and manage status.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => load()}
            disabled={busy}
            type="button"
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", background: "white", color: "#111" }}
          >
            Refresh
          </button>
          <button
            onClick={() => router.push("/admin/extractions")}
            type="button"
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", background: "white", color: "#111" }}
          >
            Go to Extractions
          </button>
        </div>
      </div>

      {msg && (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "#fee2e2", border: "1px solid #fecaca", color: "#111" }}>
          {msg}
        </div>
      )}

      <div
        style={{
          marginTop: 16,
          display: "flex",
          gap: 12,
          alignItems: "center",
          border: "1px solid #e5e7eb",
          borderRadius: 14,
          padding: 12,
          background: "white",
        }}
      >
        <div style={{ fontWeight: 800 }}>Filter</div>
        <label style={{ fontSize: 12, opacity: 0.8 }}>Status</label>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #111", background: "white", color: "#111" }}
          disabled={busy}
        >
          <option value="all">all</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.75 }}>
          showing {filtered.length} of {docs.length}
        </div>
      </div>

      <section style={{ marginTop: 16, border: "1px solid #e5e7eb", borderRadius: 16, background: "white", overflow: "hidden" }}>
        <div style={{ padding: 12, borderBottom: "1px solid #eee", fontWeight: 900 }}>Queue</div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", background: "#f8fafc" }}>
                <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Created</th>
                <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Filename</th>
                <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Doc Type</th>
                <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Status</th>
                <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 12, color: "#111", opacity: 0.75 }}>
                    {busy ? "Loading..." : "No documents."}
                  </td>
                </tr>
              ) : (
                filtered.map((d) => (
                  <tr key={d.id}>
                    <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap" }}>
                      {new Date(d.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>
                      <div style={{ fontWeight: 800 }}>{d.original_filename ?? "(no filename)"}</div>
                      <div style={{ fontSize: 12, opacity: 0.65 }}>id: {d.id.slice(0, 8)}…</div>
                    </td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{d.doc_type ?? ""}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>
                      <select
                        value={d.status}
                        onChange={(e) => updateStatus(d.id, e.target.value as DocRow["status"], d.notes)}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 10,
                          border: "1px solid #111",
                          background: "white",
                          color: "#111",
                        }}
                        disabled={busy}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap" }}>
                      <button
                        onClick={() => openSignedUrl(d)}
                        type="button"
                        style={{
                          padding: "8px 10px",
                          borderRadius: 10,
                          border: "1px solid #111",
                          background: "#111",
                          color: "white",
                          fontWeight: 800,
                          marginRight: 8,
                        }}
                        disabled={busy}
                      >
                        View
                      </button>

                      <button
                        onClick={() => router.push("/admin/extractions")}
                        type="button"
                        style={{
                          padding: "8px 10px",
                          borderRadius: 10,
                          border: "1px solid #ddd",
                          background: "white",
                          color: "#111",
                          fontWeight: 700,
                        }}
                        disabled={busy}
                      >
                        Extractions
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}