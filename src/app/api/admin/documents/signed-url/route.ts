import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { DOCUMENT_BUCKET } from "@/lib/documents";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  await requireAdminUser();

  const payload = (await request.json().catch(() => null)) as { path?: string } | null;

  if (!payload?.path) {
    return NextResponse.json({ error: "Missing file path." }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(payload.path, 60 * 10);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
