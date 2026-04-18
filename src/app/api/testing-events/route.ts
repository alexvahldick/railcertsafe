import { NextResponse } from "next/server";
import { loadAppContext } from "@/lib/app-context";
import { requireUser } from "@/lib/auth";
import { createOrUpdateTestingEvent } from "@/lib/operations-server";
import { NO_STORE_HEADERS, validateSameOrigin } from "@/lib/request-security";

export async function POST(request: Request) {
  const sameOriginError = validateSameOrigin(request);
  if (sameOriginError) {
    return sameOriginError;
  }

  const user = await requireUser();
  const context = await loadAppContext();

  if (!context.schemaReady || !context.activeClient) {
    return NextResponse.json({ error: "Client workspace is not ready." }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        eventId?: string;
        employeeId?: string;
        manager1Id?: string;
        manager2Id?: string;
        locationId?: string;
        subLocation?: string;
        engineNumber?: string;
        jobId?: string;
        methodLookupId?: string;
        observationTypeLookupId?: string;
        dutyLookupId?: string;
        eventDate?: string;
        eventTime?: string;
        conditions?: string[];
        generalComments?: string;
        notificationStatus?: "pending" | "completed";
        notificationMethodLookupId?: string;
        rows?: Array<{
          clientEnabledTestId: string;
          result: "pass" | "fail" | "";
          actionLookupId?: string;
          comments?: string;
          rowOrder: number;
        }>;
      }
    | null;

  if (!payload?.employeeId || !payload.eventDate || !payload.rows) {
    return NextResponse.json({ error: "Employee, date, and row data are required." }, { status: 400, headers: NO_STORE_HEADERS });
  }

  try {
    const eventId = await createOrUpdateTestingEvent({
      eventId: payload.eventId,
      clientId: context.activeClient.clientId,
      userId: user.id,
      employeeId: payload.employeeId,
      manager1Id: payload.manager1Id,
      manager2Id: payload.manager2Id,
      locationId: payload.locationId,
      subLocation: payload.subLocation,
      engineNumber: payload.engineNumber,
      jobId: payload.jobId,
      methodLookupId: payload.methodLookupId,
      observationTypeLookupId: payload.observationTypeLookupId,
      dutyLookupId: payload.dutyLookupId,
      eventDate: payload.eventDate,
      eventTime: payload.eventTime,
      conditions: payload.conditions ?? [],
      generalComments: payload.generalComments,
      notificationStatus: payload.notificationStatus ?? "pending",
      notificationMethodLookupId: payload.notificationMethodLookupId,
      rows: payload.rows,
    });

    return NextResponse.json({ data: { eventId } }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save testing event." }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
