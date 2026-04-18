// /src/app/api/admin/extractions/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// anon client ONLY for token validation
const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function getBearerToken(req: Request) {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

async function requireAdmin(request: Request) {
  const token = getBearerToken(request);

  if (!token) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data, error } = await supabaseAuth.auth.getUser(token);

  if (error || !data.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const email = data.user.email ?? "";
  if (!isAdminEmail(email)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user: data.user };
}

const ALLOWED_STATUSES = ["pending", "needs_review", "validated", "failed"] as const;
type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  const adminClient = getSupabaseAdmin();
  if (adminClient.error || !adminClient.client) {
    const message =
      adminClient.error === "Missing SUPABASE_SERVICE_ROLE_KEY"
        ? "Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY"
        : `Server misconfigured: ${adminClient.error ?? "unknown error"}`;
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const url = new URL(request.url);
  const statusRaw = (url.searchParams.get("status") ?? "").trim().toLowerCase();

  // status param meanings:
  // - omitted or "default": pending + needs_review
  // - "all": all statuses
  // - one of pending/needs_review/validated/failed: filter to that single status
  const statusParam = statusRaw || "default";

  let statuses: AllowedStatus[];

  if (statusParam === "default") {
    statuses = ["pending", "needs_review"];
  } else if (statusParam === "all") {
    statuses = [...ALLOWED_STATUSES];
  } else if ((ALLOWED_STATUSES as readonly string[]).includes(statusParam)) {
    statuses = [statusParam as AllowedStatus];
  } else {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { data, error } = await adminClient.client
    .from("document_extractions")
    .select(
      `
      id,
      document_id,
      status,
      confidence_score,
      extracted_text,
      extracted_fields_json,
      created_at,
      updated_at,
      validated_by,
      validated_at,
      documents:document_id (
        id,
        created_at,
        uploaded_by,
        doc_type,
        storage_path,
        original_filename,
        status,
        notes
      )
    `
    )
    .in("status", statuses)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: data ?? [] });
}
