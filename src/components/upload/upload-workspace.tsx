"use client";

import { useEffect, useState } from "react";
import {
  ACCEPTED_UPLOAD_TYPES,
  DOCUMENT_BUCKET,
  buildStoragePath,
  type DocumentRecord,
} from "@/lib/documents";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";

type Props = {
  userId: string;
  userEmail: string | null;
};

type MessageState =
  | { tone: "success" | "error"; text: string }
  | null;

export function UploadWorkspace({ userId, userEmail }: Props) {
  const [busy, setBusy] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState("part_240");
  const [records, setRecords] = useState<DocumentRecord[]>([]);
  const [message, setMessage] = useState<MessageState>(null);

  async function loadRecords() {
    const supabase = getBrowserSupabaseClient();
    const { data, error } = await supabase
      .from("documents")
      .select("id, created_at, uploaded_by, doc_type, storage_path, original_filename, status, notes")
      .eq("uploaded_by", userId)
      .order("created_at", { ascending: false })
      .limit(12);

    if (error) {
      setMessage({ tone: "error", text: error.message });
      return;
    }

    setRecords((data ?? []) as DocumentRecord[]);
  }

  useEffect(() => {
    let active = true;

    async function hydrate() {
      const supabase = getBrowserSupabaseClient();
      const { data, error } = await supabase
        .from("documents")
        .select("id, created_at, uploaded_by, doc_type, storage_path, original_filename, status, notes")
        .eq("uploaded_by", userId)
        .order("created_at", { ascending: false })
        .limit(12);

      if (!active) {
        return;
      }

      if (error) {
        setMessage({ tone: "error", text: error.message });
      } else {
        setRecords((data ?? []) as DocumentRecord[]);
      }

      setBusy(false);
    }

    void hydrate();

    return () => {
      active = false;
    };
  }, [userId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploading(true);
    setMessage(null);

    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("document") as HTMLInputElement | null;
    const file = fileInput?.files?.[0];

    if (!file) {
      setUploading(false);
      setMessage({ tone: "error", text: "Choose a file before uploading." });
      return;
    }

    if (!ACCEPTED_UPLOAD_TYPES.includes(file.type as (typeof ACCEPTED_UPLOAD_TYPES)[number])) {
      setUploading(false);
      setMessage({ tone: "error", text: "Only PDF, JPG, and PNG files are supported in this first slice." });
      return;
    }

    const storagePath = buildStoragePath(userId, file.name);
    const supabase = getBrowserSupabaseClient();

    const { error: uploadError } = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .upload(storagePath, file, {
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      setUploading(false);
      setMessage({ tone: "error", text: uploadError.message });
      return;
    }

    const { error: insertError } = await supabase.from("documents").insert({
      uploaded_by: userId,
      doc_type: docType.trim() || "unknown",
      storage_path: storagePath,
      original_filename: file.name,
      status: "received",
    });

    if (insertError) {
      await supabase.storage.from(DOCUMENT_BUCKET).remove([storagePath]);
      setUploading(false);
      setMessage({ tone: "error", text: insertError.message });
      return;
    }

    form.reset();
    setDocType("part_240");
    await loadRecords();
    setUploading(false);
    setMessage({ tone: "success", text: "Document received and queued for intake review." });
  }

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <section className="panel" style={{ padding: "1.5rem" }}>
        <div style={{ display: "grid", gap: "0.4rem" }}>
          <div className="eyebrow">Document Intake</div>
          <h1 className="title-lg">Upload certification and compliance records</h1>
          <p className="text-muted" style={{ margin: 0, maxWidth: "52rem" }}>
            Files go to private Supabase Storage. Metadata is recorded in the database so the intake queue can review, classify, and advance the record.
          </p>
          <p className="text-muted" style={{ margin: 0 }}>
            Signed in as <strong>{userEmail ?? "unknown user"}</strong>
          </p>
        </div>
      </section>

      <section className="panel" style={{ padding: "1.5rem", display: "grid", gap: "1rem" }}>
        <form className="field-grid" onSubmit={handleSubmit}>
          <label className="field-label">
            Document type
            <select className="field-select" value={docType} onChange={(event) => setDocType(event.target.value)}>
              <option value="part_240">Part 240 certification</option>
              <option value="part_242">Part 242 conductor record</option>
              <option value="rule_217_9">Rule 217.9 operating rules</option>
              <option value="training_record">Training record</option>
              <option value="evaluation">Operational evaluation</option>
              <option value="other">Other</option>
            </select>
          </label>

          <label className="field-label">
            File
            <input className="field-input" name="document" type="file" accept=".pdf,.jpg,.jpeg,.png" />
          </label>

          <button className="button-primary" disabled={uploading} type="submit">
            {uploading ? "Uploading..." : "Upload record"}
          </button>
        </form>

        {message ? (
          <div className={`message ${message.tone === "success" ? "message-success" : "message-error"}`}>
            {message.text}
          </div>
        ) : null}
      </section>

      <section className="panel" style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
          <div>
            <div className="eyebrow">Recent Activity</div>
            <h2 style={{ margin: "0.35rem 0 0", fontSize: "1.4rem" }}>Your latest uploads</h2>
          </div>
          <button className="button-secondary" onClick={() => void loadRecords()} type="button">
            Refresh list
          </button>
        </div>

        {busy ? (
          <p className="text-muted" style={{ marginTop: "1rem" }}>Loading uploads...</p>
        ) : records.length === 0 ? (
          <p className="text-muted" style={{ marginTop: "1rem" }}>No uploads yet.</p>
        ) : (
          <div style={{ marginTop: "1rem", display: "grid", gap: "0.9rem" }}>
            {records.map((record) => (
              <article className="panel-muted" key={record.id} style={{ padding: "1rem" }}>
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "0.75rem" }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{record.original_filename}</div>
                    <div className="text-muted" style={{ marginTop: "0.25rem" }}>
                      {record.doc_type} | {new Date(record.created_at).toLocaleString()}
                    </div>
                  </div>
                  <span className={`status-pill status-${record.status}`}>{record.status.replace("_", " ")}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
