"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/admin";

type IntakeDoc = {
  id: string;
  created_at: string;
  uploaded_by: string;
  doc_type: string;
  storage_path: string;
  original_filename: string;
  status: string;
  notes: string | null;
};

const STATUS_OPTIONS = ["received", "needs_review", "processed", "rejected"] as const;

export default function IntakePage() {
  const router = useRouter();
  const [busy, setBusy] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [documents, setDocuments] = useState<IntakeDoc[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [docTypeFilter, setDocTypeFilter] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const isReady = useMemo(() => Boolean(accessToken), [accessToken]);

  const loadDocuments = useCallback(
    async (token: string, status: string, docType: string) => {
      setMsg(null);

      const params = new URLSearchParams();
      if (status && status !== "all") params.set("status", status);
      if (docType) params.set("doc_type", docType.trim());

      const response = await fetch(`/api/admin/documents?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setMsg(payload.error || "Failed to load documents.");
        return;
      }

      const payload = await response.json();
      setDocuments(payload.data ?? []);
    },
    []
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

      const email = data.session.user.email ?? "";
      if (!isAdminEmail(email)) {
        router.replace("/dashboard");
        return;
      }

      setAccessToken(data.session.access_token);
      await loadDocuments(data.session.access_token, statusFilter, docTypeFilter);
      setBusy(false);
    })();

    return () => {
      mounted = false;
    };
  }, [router, statusFilter, docTypeFilter, loadDocuments]);

  async function handleUpdate(documentId: string, status: string, notes: string | null) {
    if (!accessToken) return;

    setSavingId(documentId);
    setMsg(null);

    const response = await fetch("/api/admin/documents", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ id: documentId, status, notes }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setMsg(payload.error || "Update failed.");
      setSavingId(null);
      return;
    }

    setDocuments((prev) =>
      prev.map((doc) => (doc.id === documentId ? { ...doc, status, notes } : doc))
    );
    setSavingId(null);
  }

  async function handleView(storagePath: string) {
    if (!accessToken) return;

    const response = await fetch("/api/admin/documents/signed-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ path: storagePath }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setMsg(payload.error || "Failed to create signed URL.");
      return;
    }

    const payload = await response.json();
    if (payload.url) {
      window.open(payload.url, "_blank", "noopener");
    }
  }

  if (busy) {
    return (
      <main style={{ maxWidth: 1100, margin: "40px auto", padding: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Intake queue</h1>
        <p>Loading...</p>
        {msg && <p style={{ color: "crimson" }}>{msg}</p>}
      </main>
    );
  }

  if (!isReady) {
    return null;
  }

  return (
    <main style={{ maxWidth: 1100, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Admin intake queue</h1>

      <section style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <label style={{ display: "grid", gap: 6 }}>
          Status
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            style={{ padding: 8 }}
          >
            <option value="all">All</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          Doc type
          <input
            value={docTypeFilter}
            onChange={(event) => setDocTypeFilter(event.target.value)}
            placeholder="e.g. invoice"
            style={{ padding: 8 }}
          />
        </label>
      </section>

      {msg && <p style={{ marginTop: 12, color: "crimson" }}>{msg}</p>}

      <section style={{ marginTop: 20, display: "grid", gap: 12 }}>
        {documents.length === 0 ? (
          <p>No documents found.</p>
        ) : (
          documents.map((doc) => (
            <article
              key={doc.id}
              style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, display: "grid", gap: 8 }}
            >
              <header style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{doc.original_filename}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>{new Date(doc.created_at).toLocaleString()}</div>
                </div>
                <button onClick={() => handleView(doc.storage_path)} style={{ padding: 8 }}>
                  View file
                </button>
              </header>

              <div style={{ display: "grid", gap: 4, fontSize: 14 }}>
                <div>Uploader: {doc.uploaded_by}</div>
                <div>Type: {doc.doc_type}</div>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  Status
                  <select
                    value={doc.status}
                    onChange={(event) =>
                      setDocuments((prev) =>
                        prev.map((item) =>
                          item.id === doc.id ? { ...item, status: event.target.value } : item
                        )
                      )
                    }
                    style={{ padding: 8 }}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  Notes
                  <textarea
                    value={doc.notes ?? ""}
                    onChange={(event) =>
                      setDocuments((prev) =>
                        prev.map((item) =>
                          item.id === doc.id ? { ...item, notes: event.target.value } : item
                        )
                      )
                    }
                    rows={3}
                    style={{ padding: 8 }}
                  />
                </label>

                <button
                  onClick={() => handleUpdate(doc.id, doc.status, doc.notes)}
                  disabled={savingId === doc.id}
                  style={{ padding: 8, justifySelf: "start" }}
                >
                  {savingId === doc.id ? "Saving..." : "Save"}
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
