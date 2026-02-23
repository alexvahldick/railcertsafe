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

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  const { id } = await ctx.params;

  const adminClient = getSupabaseAdmin();
  if (adminClient.error) {
    const message =
      adminClient.error === "Missing SUPABASE_SERVICE_ROLE_KEY"
        ? "Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY"
        : `Server misconfigured: ${adminClient.error}`;
    return NextResponse.json({ error: message }, { status: 500 });
  }

  let payload: {
    status?: string;
    extracted_fields_json?: any;
    extracted_text?: string | null;
    confidence_score?: number | null;
  } = {};

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const update: Record<string, any> = {};

  if (payload.status !== undefined) {
    if (!allowedStatuses.has(payload.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    update.status = payload.status;

    if (payload.status === "validated") {
      update.validated_at = new Date().toISOString();
      update.validated_by = auth.user?.id ?? null;
    } else {
      update.validated_at = null;
      update.validated_by = null;
    }
  }

  if (payload.extracted_fields_json !== undefined) {
    update.extracted_fields_json = payload.extracted_fields_json;
  }

  if (payload.extracted_text !== undefined) {
    update.extracted_text = payload.extracted_text;
  }

  if (payload.confidence_score !== undefined) {
    update.confidence_score = payload.confidence_score;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await adminClient.client
    .from("document_extractions")
    .update(update)
    .eq("id", id)
    .select(
      "id, document_id, status, confidence_score, extracted_text, extracted_fields_json, created_at, updated_at, validated_by, validated_at"
    )
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}