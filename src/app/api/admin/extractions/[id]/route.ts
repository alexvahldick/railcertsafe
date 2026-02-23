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

type PatchBody = {
  status?: ExtractionStatus;
  extracted_fields_json?: unknown;
  confidence_score?: number | null;
};

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const supabaseUserClient = createRouteHandlerClient({ cookies });
  const { data: userData, error: userErr } = await supabaseUserClient.auth.getUser();
  if (userErr) return NextResponse.json({ error: userErr.message }, { status: 401 });

  const user = userData.user;
  const email = user?.email ?? null;
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

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const update: Record<string, any> = {};

  if (body.status !== undefined) {
    if (!ALLOWED.includes(body.status)) {
      return NextResponse.json(
        { error: `Invalid status. Allowed: ${ALLOWED.join(", ")}` },
        { status: 400 }
      );
    }
    update.status = body.status;

    if (body.status === "validated") {
      update.validated_at = new Date().toISOString();
      update.validated_by = user?.id ?? null;
    } else {
      update.validated_at = null;
      update.validated_by = null;
    }
  }

  if (body.extracted_fields_json !== undefined) {
    update.extracted_fields_json = body.extracted_fields_json;
  }

  if (body.confidence_score !== undefined) {
    update.confidence_score = body.confidence_score;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("document_extractions")
    .update(update)
    .eq("id", id)
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
      validated_at
    `
    )
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ row: data });
}
