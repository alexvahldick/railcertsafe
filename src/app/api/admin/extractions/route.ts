import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";

function parseAdminEmails(raw: string | undefined) {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function isAdminEmail(email: string | null | undefined) {
  const admins = parseAdminEmails(process.env.NEXT_PUBLIC_ADMIN_EMAILS);
  const normalized = (email ?? "").trim().toLowerCase();
  return normalized.length > 0 && admins.includes(normalized);
}

const ALLOWED = ["pending", "needs_review", "validated", "failed"] as const;
type ExtractionStatus = (typeof ALLOWED)[number];

export async function GET(req: Request) {
  const supabaseUserClient = createRouteHandlerClient({ cookies });
  const { data: userData, error: userErr } = await supabaseUserClient.auth.getUser();
  if (userErr) return NextResponse.json({ error: userErr.message }, { status: 401 });

  const email = userData.user?.email ?? null;
  if (!isAdminEmail(email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL" },
      { status: 500 }
    );
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { searchParams } = new URL(req.url);
  const statusParam = (searchParams.get("status") ?? "").trim();

  const statuses: ExtractionStatus[] =
    statusParam && ALLOWED.includes(statusParam as ExtractionStatus)
      ? [statusParam as ExtractionStatus]
      : ["pending", "needs_review"];

  const { data, error } = await admin
    .from("document_extractions")
    .select(
      `
      id,
      document_id,
      status,
      confidence_score,
      extracted_fields_json,
      created_at,
      updated_at,
      validated_by,
      validated_at,
      documents:document_id (
        id,
        original_filename,
        storage_path,
        uploaded_by,
        created_at,
        status
      )
    `
    )
    .in("status", statuses)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ rows: data ?? [] });
}
