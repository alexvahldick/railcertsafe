import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/env";
import { bootstrapClientWorkspace } from "@/lib/operations-server";
import { NO_STORE_HEADERS, validateSameOrigin } from "@/lib/request-security";

export async function POST(request: Request) {
  const sameOriginError = validateSameOrigin(request);
  if (sameOriginError) {
    return sameOriginError;
  }

  const user = await requireUser();

  if (!isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Only the master administrator can initialize the workspace." }, { status: 403, headers: NO_STORE_HEADERS });
  }

  const payload = (await request.json().catch(() => null)) as { clientName?: string } | null;
  const clientName = payload?.clientName?.trim() ?? "";

  if (!clientName) {
    return NextResponse.json({ error: "Client name is required." }, { status: 400, headers: NO_STORE_HEADERS });
  }

  try {
    const workspace = await bootstrapClientWorkspace(user.id, clientName);
    return NextResponse.json({ data: workspace }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not initialize workspace." }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
