import { NextResponse } from "next/server";
import { loadAppContext } from "@/lib/app-context";
import { requireUser } from "@/lib/auth";
import { applyEventAmendment } from "@/lib/operations-server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const context = await loadAppContext();

  if (!context.schemaReady || !context.activeClient) {
    return NextResponse.json({ error: "Client workspace is not ready." }, { status: 400 });
  }

  const canAmend = context.isMasterAdmin || context.activeClient.role === "client_administrator";
  if (!canAmend) {
    return NextResponse.json({ error: "Only client administrators or the master administrator can apply amendments." }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        correctionId?: string;
        reason?: string;
        adminNotes?: string;
        eventPatch?: Record<string, unknown>;
        rowPatches?: Record<string, Record<string, unknown>>;
      }
    | null;

  const reason = payload?.reason?.trim() ?? "";
  if (!reason) {
    return NextResponse.json({ error: "Amendment reason is required." }, { status: 400 });
  }

  try {
    await applyEventAmendment({
      eventId: id,
      clientId: context.activeClient.clientId,
      userId: user.id,
      correctionId: payload?.correctionId,
      reason,
      adminNotes: payload?.adminNotes,
      eventPatch: payload?.eventPatch ?? {},
      rowPatches: payload?.rowPatches ?? {},
    });
    return NextResponse.json({ data: { eventId: id } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not apply amendment." }, { status: 500 });
  }
}
