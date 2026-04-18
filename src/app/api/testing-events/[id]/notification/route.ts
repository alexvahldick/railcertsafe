import { NextResponse } from "next/server";
import { loadAppContext } from "@/lib/app-context";
import { requireUser } from "@/lib/auth";
import { addNotificationDisposition } from "@/lib/operations-server";
import { NO_STORE_HEADERS, validateSameOrigin } from "@/lib/request-security";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sameOriginError = validateSameOrigin(request);
  if (sameOriginError) {
    return sameOriginError;
  }

  const { id } = await params;
  const user = await requireUser();
  const context = await loadAppContext();

  if (!context.schemaReady || !context.activeClient) {
    return NextResponse.json({ error: "Client workspace is not ready." }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const canUpdate = context.isMasterAdmin || context.activeClient.role === "client_administrator";
  if (!canUpdate) {
    return NextResponse.json({ error: "Only client administrators or the master administrator can complete notification." }, { status: 403, headers: NO_STORE_HEADERS });
  }

  const payload = (await request.json().catch(() => null)) as { methodLabel?: string; notes?: string } | null;
  const methodLabel = payload?.methodLabel?.trim() ?? "";

  if (!methodLabel) {
    return NextResponse.json({ error: "Notification method is required." }, { status: 400, headers: NO_STORE_HEADERS });
  }

  try {
    await addNotificationDisposition({
      eventId: id,
      clientId: context.activeClient.clientId,
      userId: user.id,
      methodLabel,
      notes: payload?.notes,
    });
    return NextResponse.json({ data: { eventId: id } }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not complete notification." }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
