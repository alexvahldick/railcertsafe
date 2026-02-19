import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "";
  const docType = url.searchParams.get("doc_type") ?? "";

  let query = supabaseAdmin
    .from("documents")
    .select("id, created_at, uploaded_by, doc_type, storage_path, original_filename, status, notes")
    .order("created_at", { ascending: false })
    .limit(100);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (docType) {
    query = query.eq("doc_type", docType);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  let payload: { id?: string; status?: string; notes?: string | null } = {};

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!payload.id || !payload.status) {
    return NextResponse.json({ error: "Missing id or status" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("documents")
    .update({ status: payload.status, notes: payload.notes ?? null })
    .eq("id", payload.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
