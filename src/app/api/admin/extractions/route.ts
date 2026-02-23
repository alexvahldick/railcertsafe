import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function requireAdmin(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const token = authHeader.slice("Bearer ".length);
  const { data, error } = await supabaseAuth.auth.getUser(token);

  if (error || !data.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (!isAdminEmail(data.user.email)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user: data.user };
}

const allowedStatuses = new Set(["pending", "needs_review", "validated", "failed"]);

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  const adminClient = getSupabaseAdmin();
  if (adminClient.error) {
    const message =
      adminClient.error === "Missing SUPABASE_SERVICE_ROLE_KEY"
        ? "Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY"
        : `Server misconfigured: ${adminClient.error}`;
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const url = new URL(request.url);
  const status = (url.searchParams.get("status") ?? "").trim();

  const statuses = status && status !== "all" ? [status] : ["pending", "needs_review"];
  for (const s of statuses) {
    if (!allowedStatuses.has(s)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
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