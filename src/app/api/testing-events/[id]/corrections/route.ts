import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createCorrectionRequest } from "@/lib/operations-server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const payload = (await request.json().catch(() => null)) as { reason?: string } | null;
  const reason = payload?.reason?.trim() ?? "";

  if (!reason) {
    return NextResponse.json({ error: "Correction reason is required." }, { status: 400 });
  }

  try {
    await createCorrectionRequest({
      eventId: id,
      userId: user.id,
      reason,
    });
    return NextResponse.json({ data: { eventId: id } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not request correction." }, { status: 500 });
  }
}
