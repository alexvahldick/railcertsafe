import "server-only";

import { buildControlNumber, CERTIFICATION_CLASS_DEFINITIONS, DEFAULT_LOOKUPS, DEFAULT_TEST_CATALOG, type LookupType } from "@/lib/operations";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

function expectSuccess(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
}

type EventRowRecord = Record<string, unknown>;
type EventRecord = Record<string, unknown> & {
  rows: EventRowRecord[];
  enabledTestsById: Record<string, Record<string, unknown>>;
  currentNotificationStatus: string;
};

export async function ensureMasterTestCatalogSeeded() {
  const supabase = getSupabaseServiceClient();
  const { count, error } = await supabase
    .from("master_test_catalog")
    .select("id", { count: "exact", head: true });
  expectSuccess(error);

  if ((count ?? 0) > 0) {
    return;
  }

  const payload = DEFAULT_TEST_CATALOG.map((test, index) => ({
    test_number: test.testNumber,
    task_name: test.taskName,
    applicability_label: test.applicabilityLabel,
    category_code: test.categoryCode,
    qualifies_conductor_annual: test.conductorAnnual,
    qualifies_engineer_annual: test.engineerAnnual,
    qualifies_engineer_check_ride: test.engineerCheckRide,
    sort_order: index,
    active: true,
  }));

  const { error: insertError } = await supabase.from("master_test_catalog").insert(payload as never);
  expectSuccess(insertError);
}

export async function bootstrapClientWorkspace(userId: string, clientName: string) {
  const supabase = getSupabaseServiceClient();
  await ensureMasterTestCatalogSeeded();

  const slugBase = clientName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "client";

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .insert({
      name: clientName.trim(),
      slug: `${slugBase}-${crypto.randomUUID().slice(0, 6)}`,
    } as never)
    .select("id, name")
    .single();
  expectSuccess(clientError);

  const clientRecord = client as unknown as { id: string; name: string };
  const clientId = String(clientRecord.id);

  const { error: roleError } = await supabase.from("user_client_roles").insert([
    { user_id: userId, client_id: clientId, role: "client_administrator" },
    { user_id: userId, client_id: clientId, role: "manager" },
  ] as never);
  expectSuccess(roleError);

  const { error: settingsError } = await supabase.from("client_settings").insert({
    client_id: clientId,
    allow_submit_before_notification: true,
    require_notification_before_final_completion: false,
    hold_inactive_employee_events: true,
  } as never);
  expectSuccess(settingsError);

  const { data: masterTests, error: testsError } = await supabase
    .from("master_test_catalog")
    .select("id")
    .order("test_number", { ascending: true });
  expectSuccess(testsError);

  const { error: enabledError } = await supabase.from("client_enabled_tests").insert(
    (masterTests ?? []).map((row) => ({
      client_id: clientId,
      master_test_id: (row as unknown as { id: string }).id,
      active: true,
    })) as never,
  );
  expectSuccess(enabledError);

  const lookupRows = (Object.entries(DEFAULT_LOOKUPS) as [LookupType, (typeof DEFAULT_LOOKUPS)[LookupType]][]).flatMap(
    ([lookupType, values]) =>
      values.map((value, index) => ({
        client_id: clientId,
        lookup_type: lookupType,
        label: value.label,
        value: value.value,
        sort_order: index,
        active: true,
        is_program_controlled: Boolean(value.isProgramControlled),
      })),
  );

  const { error: lookupError } = await supabase.from("client_lookup_values").insert(lookupRows as never);
  expectSuccess(lookupError);

  const { error: locationError } = await supabase.from("client_locations").insert({
    client_id: clientId,
    name: "Main Property",
    active: true,
  } as never);
  expectSuccess(locationError);

  return {
    clientId,
    clientName: String(clientRecord.name),
  };
}

export async function getClientSettings(clientId: string) {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("client_settings")
    .select("*")
    .eq("client_id", clientId)
    .single();
  expectSuccess(error);
  return data as unknown as {
    allow_submit_before_notification: boolean;
    require_notification_before_final_completion: boolean;
    hold_inactive_employee_events: boolean;
  };
}

export async function getLookupValues(clientId: string) {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("client_lookup_values")
    .select("*")
    .eq("client_id", clientId)
    .eq("active", true)
    .order("sort_order", { ascending: true });
  expectSuccess(error);
  return data ?? [];
}

export async function getClientLocations(clientId: string) {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("client_locations")
    .select("*")
    .eq("client_id", clientId)
    .eq("active", true)
    .order("name", { ascending: true });
  expectSuccess(error);
  return data ?? [];
}

export async function getEnabledTests(clientId: string) {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("client_enabled_tests")
    .select("id, client_id, active, master_test_id, master_test_catalog(test_number, task_name, applicability_label, category_code, qualifies_conductor_annual, qualifies_engineer_annual, qualifies_engineer_check_ride)")
    .eq("client_id", clientId)
    .eq("active", true);
  expectSuccess(error);

  return (data ?? []).map((row) => {
    const catalog = (row as {
      master_test_catalog: {
        test_number: number;
        task_name: string;
        applicability_label: string;
        category_code: string;
        qualifies_conductor_annual: boolean;
        qualifies_engineer_annual: boolean;
        qualifies_engineer_check_ride: boolean;
      } | null;
    }).master_test_catalog;

    return {
      id: String((row as unknown as { id: string }).id),
      client_id: String((row as unknown as { client_id: string }).client_id),
      master_test_id: String((row as unknown as { master_test_id: string }).master_test_id),
      active: Boolean((row as unknown as { active: boolean }).active),
      test_number: Number(catalog?.test_number ?? 0),
      task_name: String(catalog?.task_name ?? ""),
      applicability_label: String(catalog?.applicability_label ?? ""),
      category_code: String(catalog?.category_code ?? ""),
      qualifies_conductor_annual: Boolean(catalog?.qualifies_conductor_annual),
      qualifies_engineer_annual: Boolean(catalog?.qualifies_engineer_annual),
      qualifies_engineer_check_ride: Boolean(catalog?.qualifies_engineer_check_ride),
    };
  }).sort((left, right) => left.test_number - right.test_number);
}

export async function getClientEmployees(clientId: string) {
  const supabase = getSupabaseServiceClient();
  const { data: employees, error: employeeError } = await supabase
    .from("employees")
    .select("*")
    .eq("client_id", clientId)
    .order("last_name", { ascending: true });
  expectSuccess(employeeError);

  const employeeIds = (employees ?? []).map((employee) => String((employee as unknown as { id: string }).id));
  const { data: certifications, error: certError } = await supabase
    .from("employee_certification_classes")
    .select("*")
    .in("employee_id", employeeIds.length ? employeeIds : ["00000000-0000-0000-0000-000000000000"]);
  expectSuccess(certError);

  const { data: managers, error: managerError } = await supabase
    .from("client_test_managers")
    .select("*")
    .eq("client_id", clientId)
    .eq("active", true);
  expectSuccess(managerError);

  return (employees ?? []).map((employee) => {
    const id = String((employee as unknown as { id: string }).id);
    return {
      ...(employee as Record<string, unknown>),
      certifications: (certifications ?? []).filter((certification) => String((certification as unknown as { employee_id: string }).employee_id) === id),
      is_testing_manager: (managers ?? []).some((manager) => String((manager as unknown as { employee_id: string | null }).employee_id ?? "") === id),
    };
  });
}

export async function getClientTestManagers(clientId: string) {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("client_test_managers")
    .select("*")
    .eq("client_id", clientId)
    .eq("active", true)
    .order("display_name", { ascending: true });
  expectSuccess(error);
  return data ?? [];
}

export async function upsertEmployee(input: {
  clientId: string;
  employeeId?: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  middleInitial?: string;
  suffix?: string;
  status: "active" | "inactive";
  notes?: string;
  isTestingManager: boolean;
  certifications: {
    classCode: string;
    status: "active" | "inactive" | "expired";
    issueDate?: string;
    expirationDate?: string;
  }[];
}) {
  const supabase = getSupabaseServiceClient();
  const employeePayload = {
    client_id: input.clientId,
    employee_number: input.employeeNumber.trim(),
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    middle_initial: input.middleInitial?.trim() || null,
    suffix: input.suffix?.trim() || null,
    status: input.status,
    notes: input.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const response = input.employeeId
    ? await supabase.from("employees").update(employeePayload as never).eq("id", input.employeeId).select("id, first_name, last_name").single()
    : await supabase.from("employees").insert(employeePayload as never).select("id, first_name, last_name").single();
  expectSuccess(response.error);

  const employee = response.data as unknown as { id: string; first_name: string; last_name: string };

  const { error: deleteCertsError } = await supabase
    .from("employee_certification_classes")
    .delete()
    .eq("employee_id", employee.id);
  expectSuccess(deleteCertsError);

  if (input.certifications.length > 0) {
    const certificationRows = input.certifications.map((certification) => {
      const definition = CERTIFICATION_CLASS_DEFINITIONS.find((item) => item.code === certification.classCode);
      return {
        employee_id: employee.id,
        class_code: certification.classCode,
        class_name: definition?.name ?? certification.classCode,
        regulatory_part: definition?.regulatoryPart ?? null,
        status: certification.status,
        issue_date: certification.issueDate || null,
        expiration_date: certification.expirationDate || null,
        updated_at: new Date().toISOString(),
      };
    });

    const { error: insertCertsError } = await supabase
      .from("employee_certification_classes")
      .insert(certificationRows as never);
    expectSuccess(insertCertsError);
  }

  const { data: existingManager, error: existingManagerError } = await supabase
    .from("client_test_managers")
    .select("id")
    .eq("client_id", input.clientId)
    .eq("employee_id", employee.id)
    .maybeSingle();
  expectSuccess(existingManagerError);
  const existingManagerRecord = existingManager as unknown as { id: string } | null;

  if (input.isTestingManager && !existingManagerRecord) {
    const { error: insertManagerError } = await supabase.from("client_test_managers").insert({
      client_id: input.clientId,
      employee_id: employee.id,
      display_name: `${employee.last_name}, ${employee.first_name}`,
      active: true,
    } as never);
    expectSuccess(insertManagerError);
  }

  if (!input.isTestingManager && existingManagerRecord) {
    const { error: deactivateManagerError } = await supabase
      .from("client_test_managers")
      .update({ active: false } as never)
      .eq("id", String(existingManagerRecord.id));
    expectSuccess(deactivateManagerError);
  }

  return employee.id;
}

export async function createOrUpdateTestingEvent(input: {
  eventId?: string;
  clientId: string;
  userId: string;
  employeeId: string;
  manager1Id?: string;
  manager2Id?: string;
  locationId?: string;
  subLocation?: string;
  engineNumber?: string;
  jobId?: string;
  methodLookupId?: string;
  observationTypeLookupId?: string;
  dutyLookupId?: string;
  eventDate: string;
  eventTime?: string;
  conditions: string[];
  generalComments?: string;
  notificationStatus: "pending" | "completed";
  notificationMethodLookupId?: string;
  rows: {
    clientEnabledTestId: string;
    result: "pass" | "fail" | "";
    actionLookupId?: string;
    comments?: string;
    rowOrder: number;
  }[];
}) {
  const supabase = getSupabaseServiceClient();
  const payload = {
    client_id: input.clientId,
    created_by: input.userId,
    last_saved_by: input.userId,
    employee_id: input.employeeId,
    manager_1_id: input.manager1Id || null,
    manager_2_id: input.manager2Id || null,
    location_id: input.locationId || null,
    sub_location: input.subLocation?.trim() || null,
    engine_number: input.engineNumber?.trim() || null,
    job_id: input.jobId?.trim() || null,
    method_lookup_id: input.methodLookupId || null,
    observation_type_lookup_id: input.observationTypeLookupId || null,
    duty_lookup_id: input.dutyLookupId || null,
    event_date: input.eventDate,
    event_time: input.eventTime?.trim() || null,
    conditions: input.conditions,
    general_comments: input.generalComments?.trim() || null,
    notification_status: input.notificationStatus,
    notification_method_lookup_id: input.notificationMethodLookupId || null,
    updated_at: new Date().toISOString(),
  };

  const response = input.eventId
    ? await supabase.from("testing_events").update(payload as never).eq("id", input.eventId).eq("status", "draft").select("id").single()
    : await supabase
        .from("testing_events")
        .insert({
          ...payload,
          control_number: buildControlNumber(),
          status: "draft",
        } as never)
        .select("id")
        .single();
  expectSuccess(response.error);

  const eventId = String((response.data as unknown as { id: string }).id);

  const { error: deleteRowsError } = await supabase
    .from("testing_event_test_rows")
    .delete()
    .eq("event_id", eventId);
  expectSuccess(deleteRowsError);

  const performedRows = input.rows.filter((row) => row.result);
  if (performedRows.length > 0) {
    const { error: insertRowsError } = await supabase.from("testing_event_test_rows").insert(
      performedRows.map((row) => ({
        event_id: eventId,
        client_enabled_test_id: row.clientEnabledTestId,
        result: row.result === "" ? null : row.result,
        action_lookup_id: row.actionLookupId || null,
        comments: row.comments?.trim() || null,
        row_order: row.rowOrder,
      })) as never,
    );
    expectSuccess(insertRowsError);
  }

  return eventId;
}

export async function listTestingEvents(clientId: string): Promise<EventRecord[]> {
  const supabase = getSupabaseServiceClient();
  const [eventsResponse, enabledTests, dispositionsResponse] = await Promise.all([
    supabase
      .from("testing_events")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false }),
    getEnabledTests(clientId),
    supabase
      .from("event_dispositions")
      .select("*")
      .eq("disposition_type", "notification")
      .order("created_at", { ascending: false }),
  ]);

  expectSuccess(eventsResponse.error);
  expectSuccess(dispositionsResponse.error);

  const events = eventsResponse.data ?? [];
  const eventIds = events.map((event) => String((event as unknown as { id: string }).id));
  const amendments = await getEventAmendmentsIfAvailable(eventIds);

  const { data: rows, error: rowError } = await supabase
    .from("testing_event_test_rows")
    .select("*")
    .in("event_id", eventIds.length ? eventIds : ["00000000-0000-0000-0000-000000000000"])
    .order("row_order", { ascending: true });
  expectSuccess(rowError);

  const enabledTestsById = Object.fromEntries(enabledTests.map((test) => [test.id, test]));
  const notificationByEvent = new Map<string, "pending" | "completed">();

  for (const disposition of dispositionsResponse.data ?? []) {
    const eventId = String((disposition as unknown as { event_id: string }).event_id);
    if (!notificationByEvent.has(eventId)) {
      notificationByEvent.set(eventId, "completed");
    }
  }

  return events.map((event) => {
    const eventId = String((event as unknown as { id: string }).id);
    const baseEvent = {
      ...(event as Record<string, unknown>),
      rows: (rows ?? []).filter((row) => String((row as unknown as { event_id: string }).event_id) === eventId),
      enabledTestsById,
      currentNotificationStatus: notificationByEvent.get(eventId) ?? String((event as unknown as { notification_status: string }).notification_status),
    } as EventRecord;

    const eventAmendments = amendments.filter((amendment) => String((amendment as { event_id: string }).event_id) === eventId) as Array<Record<string, unknown>>;
    return applyAmendmentsToEvent(baseEvent, eventAmendments);
  });
}

export async function getEventCorrections(eventId: string) {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("event_corrections")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  expectSuccess(error);
  return data ?? [];
}

export async function getEventDispositions(eventId: string) {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("event_dispositions")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  expectSuccess(error);
  return data ?? [];
}

async function getEventAmendmentsIfAvailable(eventIds: string[]) {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("event_amendments")
    .select("*")
    .in("event_id", eventIds.length ? eventIds : ["00000000-0000-0000-0000-000000000000"])
    .order("created_at", { ascending: true });

  if (error && error.code === "42P01") {
    return [];
  }

  expectSuccess(error);
  return data ?? [];
}

function applyAmendmentsToEvent(
  event: EventRecord,
  amendments: Array<Record<string, unknown>>,
): EventRecord {
  const amendedEvent = {
    ...event,
    rows: [...event.rows],
  } as EventRecord;

  for (const amendment of amendments) {
    const payload = ((amendment.payload ?? {}) as Record<string, unknown>);
    const eventPatch = (payload.eventPatch ?? {}) as Record<string, unknown>;
    const rowPatches = (payload.rowPatches ?? {}) as Record<string, Record<string, unknown>>;

    for (const [key, value] of Object.entries(eventPatch)) {
      amendedEvent[key] = value;
    }

    if (typeof eventPatch.notification_status === "string") {
      amendedEvent.currentNotificationStatus = String(eventPatch.notification_status);
    }

    amendedEvent.rows = amendedEvent.rows.map((row) => {
      const patch = rowPatches[String(row.client_enabled_test_id)];
      return patch ? { ...row, ...patch } : row;
    });
  }

  return amendedEvent;
}

export async function getEventAmendments(eventId: string) {
  return getEventAmendmentsIfAvailable([eventId]);
}

export async function getTestingEventDetail(clientId: string, eventId: string) {
  const [events, employees, managers, locations, lookups, corrections, dispositions, amendments] = await Promise.all([
    listTestingEvents(clientId),
    getClientEmployees(clientId),
    getClientTestManagers(clientId),
    getClientLocations(clientId),
    getLookupValues(clientId),
    getEventCorrections(eventId),
    getEventDispositions(eventId),
    getEventAmendments(eventId),
  ]);

  return {
    event: events.find((candidate) => String(candidate.id) === eventId) ?? null,
    employees,
    managers,
    locations,
    lookups,
    corrections,
    dispositions,
    amendments,
  };
}

export async function submitTestingEvent(input: {
  eventId: string;
  clientId: string;
  userId: string;
}) {
  const supabase = getSupabaseServiceClient();
  const settings = await getClientSettings(input.clientId);
  const detail = await getTestingEventDetail(input.clientId, input.eventId);

  if (!detail.event) {
    throw new Error("Testing event not found.");
  }
  const event = detail.event;

  if (String(event.status) !== "draft") {
    throw new Error("Only draft events can be submitted.");
  }

  const employees = detail.employees as Array<Record<string, unknown>>;
  const employee = employees.find((candidate) => String(candidate.id) === String(event.employee_id));
  if (!employee) {
    throw new Error("Testing event employee not found.");
  }

  const rows = event.rows as { result: string | null; action_lookup_id: string | null; comments: string | null }[];
  if (rows.length === 0) {
    throw new Error("At least one completed test row is required before submit.");
  }

  if (rows.some((row) => row.result === "fail" && !row.action_lookup_id)) {
    throw new Error("Each failed row requires an action taken.");
  }

  if (rows.some((row) => row.result === "fail" && !row.comments?.trim())) {
    throw new Error("Each failed row requires a comment.");
  }

  let nextStatus = String(event.notification_status) === "completed"
    ? "submitted_complete"
    : "submitted_notification_pending";

  if (String(employee.status) !== "active" && settings.hold_inactive_employee_events) {
    nextStatus = "review_hold_employee_status";
  }

  if (!settings.allow_submit_before_notification && String(event.notification_status) !== "completed") {
    throw new Error("This client requires notification completion before final submission.");
  }

  const { error } = await supabase
    .from("testing_events")
    .update({
      status: nextStatus,
      certification_submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_saved_by: input.userId,
    } as never)
    .eq("id", input.eventId)
    .eq("status", "draft");
  expectSuccess(error);
}

export async function createCorrectionRequest(input: {
  eventId: string;
  userId: string;
  reason: string;
}) {
  const supabase = getSupabaseServiceClient();
  const { error: correctionError } = await supabase.from("event_corrections").insert({
    event_id: input.eventId,
    requested_by: input.userId,
    reason: input.reason.trim(),
    status: "requested",
  } as never);
  expectSuccess(correctionError);

  const { error: eventError } = await supabase
    .from("testing_events")
    .update({ status: "correction_requested", updated_at: new Date().toISOString() } as never)
    .eq("id", input.eventId)
    .in("status", ["submitted_notification_pending", "submitted_complete", "amended_effective"]);
  expectSuccess(eventError);
}

export async function applyEventAmendment(input: {
  eventId: string;
  userId: string;
  correctionId?: string;
  reason: string;
  adminNotes?: string;
  eventPatch: Record<string, unknown>;
  rowPatches: Record<string, Record<string, unknown>>;
}) {
  const supabase = getSupabaseServiceClient();
  const amendmentPayload = {
    eventPatch: input.eventPatch,
    rowPatches: input.rowPatches,
  };

  const { error: amendmentError } = await supabase.from("event_amendments").insert({
    event_id: input.eventId,
    correction_id: input.correctionId || null,
    created_by: input.userId,
    reason: input.reason.trim(),
    payload: amendmentPayload,
  } as never);

  if (amendmentError && amendmentError.code === "42P01") {
    throw new Error("The amendment schema is not installed yet. Run sql/004_operations_testing_amendments.sql in Supabase first.");
  }

  expectSuccess(amendmentError);

  if (input.correctionId) {
    const { error: correctionError } = await supabase
      .from("event_corrections")
      .update({
        status: "approved",
        reviewed_by: input.userId,
        admin_notes: input.adminNotes?.trim() || null,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", input.correctionId);
    expectSuccess(correctionError);
  }

  const { error: eventError } = await supabase
    .from("testing_events")
    .update({
      status: "amended_effective",
      updated_at: new Date().toISOString(),
      last_saved_by: input.userId,
    } as never)
    .eq("id", input.eventId)
    .neq("status", "draft");
  expectSuccess(eventError);
}

export async function addNotificationDisposition(input: {
  eventId: string;
  userId: string;
  methodLabel: string;
  notes?: string;
}) {
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase.from("event_dispositions").insert({
    event_id: input.eventId,
    disposition_type: "notification",
    created_by: input.userId,
    payload: {
      method: input.methodLabel,
      notes: input.notes?.trim() || null,
      completedAt: new Date().toISOString(),
    },
  } as never);
  expectSuccess(error);

  const { error: eventError } = await supabase
    .from("testing_events")
    .update({
      status: "amended_effective",
      notification_status: "completed",
      updated_at: new Date().toISOString(),
      last_saved_by: input.userId,
    } as never)
    .eq("id", input.eventId)
    .eq("status", "submitted_notification_pending");
  expectSuccess(eventError);
}

export async function getDashboardData(clientId: string) {
  const [rawEmployees, events] = await Promise.all([
    getClientEmployees(clientId),
    listTestingEvents(clientId),
  ]);

  const yearStart = `${new Date().getFullYear()}-01-01`;
  const employees = rawEmployees as Array<Record<string, unknown>>;
  const activeEmployees = employees.filter((employee) => String(employee.status) === "active");

  const conductorNeeds = activeEmployees.filter((employee) => {
    const hasConductor = (employee.certifications as { class_code: string; status: string }[]).some(
      (certification) => certification.class_code === "part_242_conductor" && certification.status === "active",
    );
    if (!hasConductor) {
      return false;
    }
    return !events.some((event) =>
      String(event.employee_id) === String(employee.id) &&
      typeof event.certification_submitted_at === "string" &&
      String(event.event_date) >= yearStart &&
      (event.rows as { result: string | null; client_enabled_test_id: string }[]).some((row) => {
        const enabledTest = event.enabledTestsById[String(row.client_enabled_test_id)];
        return Boolean(row.result) && Boolean(enabledTest?.qualifies_conductor_annual);
      }),
    );
  });

  const engineerNeeds = activeEmployees.filter((employee) => {
    const hasEngineer = (employee.certifications as { class_code: string; status: string }[]).some(
      (certification) => certification.class_code === "part_240_engineer" && certification.status === "active",
    );
    if (!hasEngineer) {
      return false;
    }
    return !events.some((event) =>
      String(event.employee_id) === String(employee.id) &&
      typeof event.certification_submitted_at === "string" &&
      String(event.event_date) >= yearStart &&
      (event.rows as { result: string | null; client_enabled_test_id: string }[]).some((row) => {
        const enabledTest = event.enabledTestsById[String(row.client_enabled_test_id)];
        return Boolean(row.result) && Boolean(enabledTest?.qualifies_engineer_annual);
      }),
    );
  });

  const engineerCheckRideNeeds = activeEmployees.filter((employee) => {
    const hasEngineer = (employee.certifications as { class_code: string; status: string }[]).some(
      (certification) => certification.class_code === "part_240_engineer" && certification.status === "active",
    );
    if (!hasEngineer) {
      return false;
    }
    return !events.some((event) =>
      String(event.employee_id) === String(employee.id) &&
      typeof event.certification_submitted_at === "string" &&
      String(event.event_date) >= yearStart &&
      (event.rows as { result: string | null; client_enabled_test_id: string }[]).some((row) => {
        const enabledTest = event.enabledTestsById[String(row.client_enabled_test_id)];
        return Boolean(row.result) && Boolean(enabledTest?.qualifies_engineer_check_ride);
      }),
    );
  });

  return {
    draftCount: events.filter((event) => String(event.status) === "draft").length,
    pendingNotificationCount: events.filter((event) => String(event.currentNotificationStatus) === "pending" && String(event.status) !== "draft").length,
    eventCount: events.length,
    rowCount: events.reduce((total, event) => total + (event.rows as { result: string | null }[]).filter((row) => Boolean(row.result)).length, 0),
    conductorNeeds,
    engineerNeeds,
    engineerCheckRideNeeds,
    events,
  };
}
