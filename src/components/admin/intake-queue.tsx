"use client";

import { useState } from "react";
import { DOCUMENT_STATUSES, type DocumentRecord, type DocumentStatus } from "@/lib/documents";

type Props = {
  initialDocuments: DocumentRecord[];
};

type MessageState =
  | { tone: "success" | "error"; text: string }
  | null;

export function IntakeQueue({ initialDocuments }: Props) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [filter, setFilter] = useState<DocumentStatus | "all">("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<MessageState>(null);

  const visibleDocuments =
    filter === "all" ? documents : documents.filter((document) => document.status === filter);

  async function refreshQueue() {
    setMessage(null);
    const response = await fetch("/api/admin/documents", { cache: "no-store" });
    const json = (await response.json()) as { data?: DocumentRecord[]; error?: string };

    if (!response.ok) {
      setMessage({ tone: "error", text: json.error ?? "Failed to reload intake queue." });
      return;
    }

    setDocuments(json.data ?? []);
  }

  async function updateDocument(document: DocumentRecord, nextStatus: DocumentStatus) {
    setBusyId(document.id);
    setMessage(null);

    const response = await fetch("/api/admin/documents", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: document.id,
        status: nextStatus,
      }),
    });

    const json = (await response.json()) as { data?: DocumentRecord; error?: string };

    if (!response.ok || !json.data) {
      setBusyId(null);
      setMessage({ tone: "error", text: json.error ?? "Failed to update record." });
      return;
    }

    setDocuments((current) =>
      current.map((entry) => (entry.id === document.id ? json.data! : entry)),
    );
    setBusyId(null);
    setMessage({ tone: "success", text: `Updated ${document.original_filename} to ${nextStatus}.` });
  }

  async function openDocument(document: DocumentRecord) {
    setMessage(null);

    const response = await fetch("/api/admin/documents/signed-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ path: document.storage_path }),
    });

    const json = (await response.json()) as { url?: string; error?: string };

    if (!response.ok || !json.url) {
      setMessage({ tone: "error", text: json.error ?? "Could not create a signed URL." });
      return;
    }

    window.open(json.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <section className="panel" style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.9rem", justifyContent: "space-between", alignItems: "end" }}>
          <div>
            <div className="eyebrow">Admin Intake</div>
            <h1 className="title-lg">Review uploaded records and advance status</h1>
            <p className="text-muted" style={{ margin: "0.5rem 0 0", maxWidth: "50rem" }}>
              This first slice keeps the workflow controlled: incoming files start as received and move toward validation or failure.
            </p>
          </div>

          <div className="button-row">
            <select className="field-select" value={filter} onChange={(event) => setFilter(event.target.value as DocumentStatus | "all")}>
              <option value="all">All statuses</option>
              {DOCUMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.replace("_", " ")}
                </option>
              ))}
            </select>
            <button className="button-secondary" onClick={() => void refreshQueue()} type="button">
              Refresh queue
            </button>
          </div>
        </div>
      </section>

      {message ? (
        <div className={`message ${message.tone === "success" ? "message-success" : "message-error"}`}>
          {message.text}
        </div>
      ) : null}

      <section className="panel" style={{ padding: "0.4rem 0.4rem 1rem" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Type</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleDocuments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-muted">
                    No matching documents in the intake queue.
                  </td>
                </tr>
              ) : (
                visibleDocuments.map((document) => (
                  <tr key={document.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{document.original_filename}</div>
                      <div className="text-muted" style={{ marginTop: "0.35rem" }}>
                        {document.id.slice(0, 8)} · {document.uploaded_by.slice(0, 8)}
                      </div>
                    </td>
                    <td>{document.doc_type}</td>
                    <td>{new Date(document.created_at).toLocaleString()}</td>
                    <td>
                      <span className={`status-pill status-${document.status}`}>
                        {document.status.replace("_", " ")}
                      </span>
                    </td>
                    <td>
                      <div className="button-row">
                        <button className="button-secondary" onClick={() => void openDocument(document)} type="button">
                          View file
                        </button>
                        <select
                          className="field-select"
                          disabled={busyId === document.id}
                          value={document.status}
                          onChange={(event) => void updateDocument(document, event.target.value as DocumentStatus)}
                        >
                          {DOCUMENT_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status.replace("_", " ")}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
