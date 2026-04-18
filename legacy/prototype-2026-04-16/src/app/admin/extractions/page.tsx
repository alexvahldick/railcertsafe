"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type DocInfo = {
  id: string;
  original_filename: string | null;
  storage_path: string | null;
  uploaded_by: string | null;
  created_at: string;
  status: string;
  doc_type?: string | null;
  notes?: string | null;
};

type ExtractionRow = {
  id: string;
  document_id: string;
  status: "pending" | "needs_review" | "validated" | "failed";
  confidence_score: number | null;
  extracted_text?: string | null;
  extracted_fields_json: any;
  created_at: string;
  updated_at: string;
  validated_by: string | null;
  validated_at: string | null;
  documents?: DocInfo | null;
};

const STATUS_OPTIONS = ["pending", "needs_review", "validated", "failed"] as const;
const FILTER_OPTIONS = ["default", "all", ...STATUS_OPTIONS] as const;
type FilterValue = (typeof FILTER_OPTIONS)[number];

function prettyJson(value: any) {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  const token = data.session?.access_token;
  if (!token) throw new Error("Not logged in (missing session token)");
  return token;
}

function buildListUrl(filter: FilterValue) {
  // "default" preserves existing behavior of the API:
  // no status param => pending + needs_review
  if (filter === "default") return "/api/admin/extractions";
  if (filter === "all") return "/api/admin/extractions?status=all";
  return `/api/admin/extractions?status=${encodeURIComponent(filter)}`;
}

export default function AdminExtractionsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ExtractionRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [filter, setFilter] = useState<FilterValue>("default");

  const [activeId, setActiveId] = useState<string | null>(null);
  const active = useMemo(() => rows.find((r) => r.id === activeId) ?? null, [rows, activeId]);

  const [editorText, setEditorText] = useState<string>("{}");
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>("pending");

  async function load(opts?: { preserveActive?: boolean }) {
    setBusy(true);
    setMsg(null);

    try {
      const token = await getAccessToken();
      const url = buildListUrl(filter);

      const res = await fetch(url, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load");

      const list: ExtractionRow[] = json.data ?? [];
      setRows(list);

      const preserve = opts?.preserveActive ?? true;
      if (list.length > 0) {
        if (preserve && activeId && list.some((r) => r.id === activeId)) {
          // keep current
        } else {
          setActiveId(list[0].id);
        }
      } else {
        setActiveId(null);
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

  // Reload when filter changes
  useEffect(() => {
    load({ preserveActive: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    if (!active) return;
    setEditorText(prettyJson(active.extracted_fields_json));
    setStatus(active.status);
  }, [active]);

  async function save() {
    if (!active) {
      setMsg("Select an extraction row first.");
      return;
    }

    setBusy(true);
    setMsg(null);

    let parsed: any;
    try {
      parsed = JSON.parse(editorText);
    } catch {
      setBusy(false);
      setMsg("JSON is invalid. Fix it before saving.");
      return;
    }

    try {
      const token = await getAccessToken();

      const res = await fetch(`/api/admin/extractions/${active.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, extracted_fields_json: parsed }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Save failed");

      const updated: ExtractionRow = json.data;
      setRows((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));

      // If you validated and you're in default view, it will disappear from the list.
      // Reload to keep the left panel consistent.
      if (filter === "default" && status === "validated") {
        await load({ preserveActive: false });
      }

      if (json?.parent_sync?.attempted && json?.parent_sync?.ok === false) {
        setMsg(`Saved, but parent document status sync failed: ${json.parent_sync.error ?? "unknown error"}`);
      } else {
        setMsg("Saved.");
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
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: "#111" }}>Admin — Extractions</h1>
          <p style={{ marginTop: 6, color: "#111", opacity: 0.75 }}>
            Review and validate extracted fields (scaffolding; OCR provider comes later).
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ fontSize: 12, fontWeight: 800, color: "#111" }}>Filter</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterValue)}
            disabled={busy}
            style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #111", background: "white", color: "#111" }}
          >
            <option value="default">default (pending + needs_review)</option>
            <option value="all">all</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <button
            onClick={() => load()}
            disabled={busy}
            type="button"
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", background: "white", color: "#111" }}
          >
            Refresh
          </button>
          <button
            onClick={() => router.push("/admin/intake")}
            type="button"
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", background: "white", color: "#111" }}
          >
            Back to Intake
          </button>
        </div>
      </div>

      {msg && (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "#fff7ed", border: "1px solid #fed7aa", color: "#111" }}>
          {msg}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 16, marginTop: 16 }}>
        {/* Left: queue */}
        <section style={{ border: "1px solid #e5e7eb", borderRadius: 16, background: "white", overflow: "hidden", color: "#111" }}>
          <div style={{ padding: 12, borderBottom: "1px solid #eee" }}>
            <div style={{ fontWeight: 800, color: "#111" }}>Queue ({rows.length})</div>
            <div style={{ fontSize: 12, color: "#111", opacity: 0.65, marginTop: 4 }}>
              {filter === "default" ? "Showing pending + needs_review" : `Showing: ${filter}`}
            </div>
          </div>

          <div style={{ maxHeight: 640, overflow: "auto" }}>
            {rows.length === 0 ? (
              <div style={{ padding: 12, color: "#111", opacity: 0.7 }}>{busy ? "Loading..." : "No rows."}</div>
            ) : (
              rows.map((r) => {
                const isActive = r.id === activeId;
                const filename = r.documents?.original_filename ?? "(no filename)";

                return (
                  <button
                    key={r.id}
                    onClick={() => setActiveId(r.id)}
                    type="button"
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: 12,
                      border: "none",
                      borderBottom: "1px solid #f3f4f6",
                      background: isActive ? "#111827" : "white",
                      color: isActive ? "white" : "#111",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: 13 }}>{filename}</div>
                    <div style={{ fontSize: 12, marginTop: 4, opacity: isActive ? 0.9 : 0.7 }}>
                      status: <b>{r.status}</b> • created: {new Date(r.created_at).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 12, marginTop: 4, opacity: isActive ? 0.85 : 0.6 }}>
                      doc_id: {r.document_id.slice(0, 8)}…
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* Right: editor */}
        <section style={{ border: "2px solid #111", borderRadius: 16, background: "#f8fafc", padding: 16, color: "#111" }}>
          {!active ? (
            <div style={{ color: "#111", fontWeight: 700 }}>Select an extraction row on the left.</div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 16, color: "#111" }}>
                    {active.documents?.original_filename ?? "Extraction"}
                  </div>
                  <div style={{ fontSize: 12, color: "#111", opacity: 0.8, marginTop: 6 }}>
                    <div>Extraction ID: {active.id}</div>
                    <div>Document ID: {active.document_id}</div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <label style={{ fontSize: 12, color: "#111", fontWeight: 700 }}>Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #111", background: "white", color: "#111" }}
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
                    type="button"
                    style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #111", background: "#111", color: "white", fontWeight: 800 }}
                  >
                    Save
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 12, fontSize: 12, color: "#111", opacity: 0.8 }}>
                Edit <code>extracted_fields_json</code> (JSONB).
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
                  border: "1px solid #111",
                  background: "white",
                  color: "#111",
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