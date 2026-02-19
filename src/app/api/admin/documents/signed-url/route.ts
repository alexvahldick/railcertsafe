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

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  let payload: { path?: string } = {};

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!payload.path) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.storage
    .from("documents")
    .createSignedUrl(payload.path, 60);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
