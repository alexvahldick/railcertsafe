"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type DocInfo = {
  id: string;
  original_filename: string | null;
  storage_path: string | null;
  uploaded_by: string | null;
  created_at: string;
  status: string;
};

type ExtractionRow = {
  id: string;
  document_id: string;
  status: "pending" | "needs_review" | "validated" | "failed";
  confidence_score: number | null;
  extracted_fields_json: any;
  created_at: string;
  updated_at: string;
  validated_by: string | null;
  validated_at: string | null;
  documents?: DocInfo | null;
};

const STATUS_OPTIONS = ["pending", "needs_review", "validated", "failed"] as const;

function prettyJson(value: any) {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

export default function AdminExtractionsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ExtractionRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const active = useMemo(() => rows.find((r) => r.id === activeId) ?? null, [rows, activeId]);

  const [editorText, setEditorText] = useState<string>("{}");
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>("pending");

  async function load() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/extractions", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load");
      setRows(json.rows ?? []);
      if ((json.rows ?? []).length > 0 && !activeId) {
        const first = json.rows[0] as ExtractionRow;
        setActiveId(first.id);
      }
    } catch (e: any) {
      setMsg(e?.message ?? "Failed to load");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!active) return;
    setEditorText(prettyJson(active.extracted_fields_json));
    setStatus(active.status);
  }, [active]);

  async function save() {
    if (!active) return;
    setBusy(true);
    setMsg(null);

    let parsed: any;
    try {
      parsed = JSON.parse(editorText);
    } catch (e: any) {
      setBusy(false);
      setMsg("JSON is invalid. Fix it before saving.");
      return;
    }

    try {
      const res = await fetch(`/api/admin/extractions/${active.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          extracted_fields_json: parsed,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Save failed");

      const updated: ExtractionRow = json.row;
      setRows((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));

      setMsg("Saved.");
      if (status === "validated") {
        const remaining = rows.filter(
          (r) => r.id !== active.id && (r.status === "pending" || r.status === "needs_review")
        );
        if (remaining.length > 0) setActiveId(remaining[0].id);
      }
    } catch (e: any) {
      setMsg(e?.message ?? "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 1200, margin: "32px auto", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Admin — Extractions</h1>
          <p style={{ marginTop: 6, color: "#555" }}>
            Review and validate extracted fields (stub scaffolding; OCR provider comes later).
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => load()}
            disabled={busy}
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", background: "white" }}
          >
            Refresh
          </button>
          <button
            onClick={() => router.push("/admin/intake")}
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", background: "white" }}
          >
            Back to Intake
          </button>
        </div>
      </div>

      {msg && (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "#fff7ed", border: "1px solid #fed7aa" }}>
          {msg}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 16, marginTop: 16 }}>
        <section style={{ border: "1px solid #e5e7eb", borderRadius: 16, background: "white", overflow: "hidden" }}>
          <div style={{ padding: 12, borderBottom: "1px solid #eee" }}>
            <div style={{ fontWeight: 700 }}>Queue</div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
              Showing pending + needs_review (via API default)
            </div>
          </div>

          <div style={{ maxHeight: 640, overflow: "auto" }}>
            {rows.length === 0 ? (
              <div style={{ padding: 12, color: "#666" }}>{busy ? "Loading..." : "No rows."}</div>
            ) : (
              rows.map((r) => {
                const isActive = r.id === activeId;
                const filename = r.documents?.original_filename ?? "(no filename)";
                return (
                  <button
                    key={r.id}
                    onClick={() => setActiveId(r.id)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: 12,
                      border: "none",
                      borderBottom: "1px solid #f3f4f6",
                      background: isActive ? "#f8fafc" : "white",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{filename}</div>
                    <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                      status: <b>{r.status}</b> • created: {new Date(r.created_at).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 12, color: "#777", marginTop: 4 }}>
                      doc_id: {r.document_id.slice(0, 8)}…
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section style={{ border: "1px solid #e5e7eb", borderRadius: 16, background: "white", padding: 16 }}>
          {!active ? (
            <div style={{ color: "#666" }}>Select an extraction row.</div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>
                    {active.documents?.original_filename ?? "Extraction"}
                  </div>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                    Extraction ID: {active.id}
                    <br />
                    Document ID: {active.document_id}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <label style={{ fontSize: 12, color: "#555" }}>Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd" }}
                    disabled={busy}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={save}
                    disabled={busy}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid #111",
                      background: "#111",
                      color: "white",
                      fontWeight: 700,
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 12, fontSize: 12, color: "#666" }}>
                Edit <code>extracted_fields_json</code> (JSONB). Keep this simple for now: placeholder key/value pairs.
              </div>

              <textarea
                value={editorText}
                onChange={(e) => setEditorText(e.target.value)}
                spellCheck={false}
                style={{
                  marginTop: 10,
                  width: "100%",
                  height: 520,
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                  fontSize: 12,
                  lineHeight: 1.4,
                }}
              />
            </>
          )}
        </section>
      </div>
    </main>
  );
}
