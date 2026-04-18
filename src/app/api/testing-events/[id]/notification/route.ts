import { NextResponse } from "next/server";
import { loadAppContext } from "@/lib/app-context";
import { requireUser } from "@/lib/auth";
import { addNotificationDisposition } from "@/lib/operations-server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const context = await loadAppContext();

  if (!context.schemaReady || !context.activeClient) {
    return NextResponse.json({ error: "Client workspace is not ready." }, { status: 400 });
  }

  const canUpdate = context.isMasterAdmin || context.activeClient.role === "client_administrator";
  if (!canUpdate) {
    return NextResponse.json({ error: "Only client administrators or the master administrator can complete notification." }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as { methodLabel?: string; notes?: string } | null;
  const methodLabel = payload?.methodLabel?.trim() ?? "";

  if (!methodLabel) {
    return NextResponse.json({ error: "Notification method is required." }, { status: 400 });
  }

  try {
    await addNotificationDisposition({
      eventId: id,
      clientId: context.activeClient.clientId,
      userId: user.id,
      methodLabel,
      notes: payload?.notes,
    });
    return NextResponse.json({ data: { eventId: id } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not complete notification." }, { status: 500 });
  }
}
