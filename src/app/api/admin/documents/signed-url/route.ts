import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { DOCUMENT_BUCKET } from "@/lib/documents";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

const responseHeaders = {
  "Cache-Control": "no-store",
};

export async function POST(request: Request) {
  await requireAdminUser();

  const payload = (await request.json().catch(() => null)) as { path?: string } | null;
  const path = payload?.path?.trim() ?? "";

  if (!path) {
    return NextResponse.json({ error: "Missing file path." }, { status: 400, headers: responseHeaders });
  }

  const supabase = getSupabaseServiceClient();
  const { data: record, error: recordError } = await supabase
    .from("documents")
    .select("id")
    .eq("storage_path", path)
    .maybeSingle();

  if (recordError) {
    return NextResponse.json({ error: recordError.message }, { status: 500, headers: responseHeaders });
  }

  if (!record) {
    return NextResponse.json({ error: "Document record not found for that storage path." }, { status: 404, headers: responseHeaders });
  }

  const { data, error } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(path, 60 * 5);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: responseHeaders });
  }

  return NextResponse.json({ url: data.signedUrl }, { headers: responseHeaders });
}
