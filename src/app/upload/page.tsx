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

  if (busy) {
    return (
      <main style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Upload</h1>
        <p>Loading...</p>
        {msg && <p style={{ color: "crimson" }}>{msg}</p>}
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Upload document</h1>
      <p style={{ marginTop: 8 }}>Signed in as: {email ?? "Unknown"}</p>

      <form onSubmit={handleUpload} style={{ marginTop: 16, display: "grid", gap: 12, maxWidth: 520 }}>
        <label style={{ display: "grid", gap: 6 }}>
          Document type (optional)
          <input
            name="docType"
            value={docType}
            onChange={(event) => setDocType(event.target.value)}
            style={{ padding: 10 }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          File (PDF, JPG, PNG)
          <input name="file" type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ padding: 6 }} />
        </label>

        <button type="submit" disabled={uploading} style={{ padding: 10 }}>
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </form>

      {msg && <p style={{ marginTop: 12, color: msg.includes("received") ? "green" : "crimson" }}>{msg}</p>}

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Recent uploads</h2>
        {uploads.length === 0 ? (
          <p style={{ marginTop: 8 }}>No uploads yet.</p>
        ) : (
          <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
            {uploads.map((upload) => (
              <div
                key={upload.id}
                style={{ border: "1px solid #ddd", borderRadius: 6, padding: 12, display: "grid", gap: 4 }}
              >
                <div style={{ fontWeight: 600 }}>{upload.original_filename}</div>
                <div>Type: {upload.doc_type}</div>
                <div>Status: {upload.status}</div>
                <div style={{ color: "#666", fontSize: 12 }}>{new Date(upload.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
