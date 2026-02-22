"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type UploadRow = {
  id: string;
  created_at: string;
  doc_type: string;
  status: string;
  original_filename: string;
  storage_path: string;
};

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png"];

export default function UploadPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const [docType, setDocType] = useState("unknown");
  const [uploading, setUploading] = useState(false);

  const loadUploads = useCallback(async (currentUserId: string) => {
    const { data, error } = await supabase
      .from("documents")
      .select("id, created_at, doc_type, status, original_filename, storage_path")
      .eq("uploaded_by", currentUserId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      setMsg(error.message);
      return;
    }

    setUploads(data ?? []);
  }, []);

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
      setUserId(data.session.user.id);
      await loadUploads(data.session.user.id);
      setBusy(false);
    })();

    return () => {
      mounted = false;
    };
  }, [router, loadUploads]);

  function sanitizeFilename(filename: string) {
    const trimmed = filename.trim();
    const safe = trimmed.replace(/[^a-zA-Z0-9._-]+/g, "_");
    return safe || "document";
  }

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMsg(null);

    if (!userId) return;

    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement | null;
    const file = fileInput?.files?.[0];

    if (!file) {
      setMsg("Please choose a file.");
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setMsg("Only PDF, JPG, or PNG files are allowed.");
      return;
    }

    setUploading(true);

    const now = new Date();
    const yyyyMm = now.toISOString().slice(0, 7);
    const safeName = sanitizeFilename(file.name);
    const uniqueId = crypto.randomUUID();
    const storagePath = `${userId}/${yyyyMm}/${uniqueId}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      setMsg(uploadError.message);
      setUploading(false);
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
      await supabase.storage.from("documents").remove([storagePath]);
      setMsg(insertError.message);
      setUploading(false);
      return;
    }

    form.reset();
    setDocType("unknown");
    await loadUploads(userId);
    setUploading(false);
    setMsg("Upload received.");
  }

  const shellStyle: React.CSSProperties = {
    minHeight: "100vh",
    background: "#f6f7fb", // light app background so inputs are always visible
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

  const inputStyle: React.CSSProperties = {
    padding: 10,
    border: "1px solid #cfd6e4",
    borderRadius: 8,
    background: "#fff",
    color: "#111",
    outline: "none",
  };

  const fileStyle: React.CSSProperties = {
    padding: 8,
    border: "1px solid #cfd6e4",
    borderRadius: 8,
    background: "#fff",
    color: "#111",
  };

  const buttonStyle: React.CSSProperties = {
    padding: 10,
    borderRadius: 10,
    border: "1px solid #1f2937",
    background: uploading ? "#374151" : "#111827",
    color: "#fff",
    cursor: uploading ? "not-allowed" : "pointer",
  };

  if (busy) {
    return (
      <main style={shellStyle}>
        <div style={cardStyle}>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Upload</h1>
          <p style={{ marginTop: 10 }}>Loading...</p>
          {msg && <p style={{ color: "crimson", marginTop: 10 }}>{msg}</p>}
        </div>
      </main>
    );
  }

  return (
    <main style={shellStyle}>
      <div style={cardStyle}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Upload document</h1>
        <p style={{ marginTop: 8, color: "#374151" }}>
          Signed in as: <span style={{ fontWeight: 600, color: "#111" }}>{email ?? "Unknown"}</span>
        </p>

        <form
          onSubmit={handleUpload}
          style={{
            marginTop: 16,
            display: "grid",
            gap: 12,
            maxWidth: 560,
          }}
        >
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 600 }}>Document type (optional)</span>
            <input
              name="docType"
              value={docType}
              onChange={(event) => setDocType(event.target.value)}
              style={inputStyle}
              placeholder="e.g., ops_test, eval, training_record"
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 600 }}>File (PDF, JPG, PNG)</span>
            <input name="file" type="file" accept=".pdf,.jpg,.jpeg,.png" style={fileStyle} />
            <span style={{ fontSize: 12, color: "#6b7280" }}>
              Tip: photos of forms work fine — we’ll extract later.
            </span>
          </label>

          <button type="submit" disabled={uploading} style={buttonStyle}>
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </form>

        {msg && (
          <p style={{ marginTop: 12, color: msg.includes("received") ? "green" : "crimson" }}>
            {msg}
          </p>
        )}

        <section style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Recent uploads</h2>

          {uploads.length === 0 ? (
            <p style={{ marginTop: 10, color: "#374151" }}>No uploads yet.</p>
          ) : (
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              {uploads.map((upload) => (
                <div
                  key={upload.id}
                  style={{
                    border: "1px solid #e6e8ef",
                    borderRadius: 10,
                    padding: 12,
                    display: "grid",
                    gap: 6,
                    background: "#fff",
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{upload.original_filename}</div>
                  <div style={{ color: "#374151" }}>Type: {upload.doc_type}</div>
                  <div style={{ color: "#374151" }}>Status: {upload.status}</div>
                  <div style={{ color: "#6b7280", fontSize: 12 }}>
                    {new Date(upload.created_at).toLocaleString()}
                  </div>
                  <div style={{ color: "#6b7280", fontSize: 12 }}>
                    Path: {upload.storage_path}
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