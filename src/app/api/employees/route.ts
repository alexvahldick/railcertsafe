import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { loadAppContext } from "@/lib/app-context";
import { upsertEmployee } from "@/lib/operations-server";
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
        employeeId?: string;
        employeeNumber?: string;
        firstName?: string;
        lastName?: string;
        middleInitial?: string;
        suffix?: string;
        status?: "active" | "inactive";
        notes?: string;
        isTestingManager?: boolean;
        certifications?: Array<{
          classCode: string;
          status: "active" | "inactive" | "expired";
          issueDate?: string;
          expirationDate?: string;
        }>;
      }
    | null;

  if (!payload?.employeeNumber || !payload.firstName || !payload.lastName || !payload.status) {
    return NextResponse.json({ error: "Employee number, first name, last name, and status are required." }, { status: 400, headers: NO_STORE_HEADERS });
  }

  try {
    const employeeId = await upsertEmployee({
      clientId: context.activeClient.clientId,
      employeeId: payload.employeeId,
      employeeNumber: payload.employeeNumber,
      firstName: payload.firstName,
      lastName: payload.lastName,
      middleInitial: payload.middleInitial,
      suffix: payload.suffix,
      status: payload.status,
      notes: payload.notes,
      isTestingManager: Boolean(payload.isTestingManager),
      certifications: payload.certifications ?? [],
    });

    return NextResponse.json({ data: { employeeId, savedBy: user.id } }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save employee." }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
