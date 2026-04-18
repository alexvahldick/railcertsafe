import { NextResponse } from "next/server";
import { loadAppContext } from "@/lib/app-context";
import { requireUser } from "@/lib/auth";
import { createCorrectionRequest } from "@/lib/operations-server";
import { NO_STORE_HEADERS, validateSameOrigin } from "@/lib/request-security";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sameOriginError = validateSameOrigin(request);
  if (sameOriginError) {
    return sameOriginError;
  }

  const { id } = await params;
  const user = await requireUser();
  const context = await loadAppContext();
  const payload = (await request.json().catch(() => null)) as { reason?: string } | null;
  const reason = payload?.reason?.trim() ?? "";

  if (!context.schemaReady || !context.activeClient) {
    return NextResponse.json({ error: "Client workspace is not ready." }, { status: 400, headers: NO_STORE_HEADERS });
  }

  if (!reason) {
    return NextResponse.json({ error: "Correction reason is required." }, { status: 400, headers: NO_STORE_HEADERS });
  }

  try {
    await createCorrectionRequest({
      eventId: id,
      clientId: context.activeClient.clientId,
      userId: user.id,
      reason,
    });
    return NextResponse.json({ data: { eventId: id } }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not request correction." }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
