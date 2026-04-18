import { NextResponse } from "next/server";
import { loadAppContext } from "@/lib/app-context";
import { requireUser } from "@/lib/auth";
import { submitTestingEvent } from "@/lib/operations-server";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const context = await loadAppContext();

  if (!context.schemaReady || !context.activeClient) {
    return NextResponse.json({ error: "Client workspace is not ready." }, { status: 400 });
  }

  try {
    await submitTestingEvent({
      eventId: id,
      clientId: context.activeClient.clientId,
      userId: user.id,
    });
    return NextResponse.json({ data: { eventId: id } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not submit testing event." }, { status: 500 });
  }
}
