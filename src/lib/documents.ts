export const DOCUMENT_BUCKET = "documents";

export const DOCUMENT_STATUSES = [
  "received",
  "pending",
  "needs_review",
  "validated",
  "failed",
] as const;

export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export type DocumentRecord = {
  id: string;
  created_at: string;
  updated_at: string | null;
  uploaded_by: string;
  doc_type: string;
  storage_path: string;
  original_filename: string;
  status: DocumentStatus;
  notes: string | null;
};

export const ACCEPTED_UPLOAD_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export function sanitizeFilename(filename: string) {
  const trimmed = filename.trim();
  const safe = trimmed.replace(/[^a-zA-Z0-9._-]+/g, "_");
  return safe || "document";
}

export function buildStoragePath(userId: string, filename: string) {
  const now = new Date();
  const month = now.toISOString().slice(0, 7);
  return `${userId}/${month}/${crypto.randomUUID()}-${sanitizeFilename(filename)}`;
}

export function mapLegacyStatus(value: string | null | undefined): DocumentStatus {
  switch ((value ?? "").trim().toLowerCase()) {
    case "received":
      return "received";
    case "extracting":
    case "pending":
      return "pending";
    case "needs_review":
      return "needs_review";
    case "processed":
    case "validated":
      return "validated";
    case "rejected":
    case "failed":
      return "failed";
    default:
      return "received";
  }
}
