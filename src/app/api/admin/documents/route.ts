import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { DOCUMENT_STATUSES, mapLegacyStatus, type DocumentRecord, type DocumentStatus } from "@/lib/documents";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

function normalizeRecord(record: Record<string, unknown>): DocumentRecord {
  return {
    id: String(record.id),
    created_at: String(record.created_at),
    updated_at: record.updated_at ? String(record.updated_at) : null,
    uploaded_by: String(record.uploaded_by),
    doc_type: String(record.doc_type ?? "unknown"),
    storage_path: String(record.storage_path),
    original_filename: String(record.original_filename),
    status: mapLegacyStatus(String(record.status ?? "received")),
    notes: typeof record.notes === "string" ? record.notes : null,
  };
}

export async function GET(request: Request) {
  await requireAdminUser();

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status");
  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from("documents")
    .select("id, created_at, uploaded_by, doc_type, storage_path, original_filename, status, notes")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const normalized = (data ?? []).map((record) => normalizeRecord(record as Record<string, unknown>));
  const filtered =
    statusFilter && statusFilter !== "all"
      ? normalized.filter((record) => record.status === statusFilter)
      : normalized;

  return NextResponse.json({ data: filtered });
}

export async function PATCH(request: Request) {
  await requireAdminUser();

  const payload = (await request.json().catch(() => null)) as
    | { id?: string; status?: DocumentStatus; notes?: string | null }
    | null;

  if (!payload?.id || !payload.status) {
    return NextResponse.json({ error: "Missing id or status." }, { status: 400 });
  }

  if (!DOCUMENT_STATUSES.includes(payload.status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const updatePayload = {
    status: payload.status,
    notes: payload.notes ?? null,
  } as never;

  const { data, error } = await supabase
    .from("documents")
    .update(updatePayload)
    .eq("id", payload.id)
    .select("id, created_at, uploaded_by, doc_type, storage_path, original_filename, status, notes")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: normalizeRecord(data as Record<string, unknown>) });
}
