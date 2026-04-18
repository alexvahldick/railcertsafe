"use client";

import { useMemo, useState } from "react";
import { CONDITION_OPTIONS, labelForCondition } from "@/lib/operations";

type Manager = { id: string; display_name: string };
type Location = { id: string; name: string };
type Employee = { id: string; first_name: string; last_name: string; employee_number: string };
type Lookup = { id: string; label: string; lookup_type: string };
type Correction = { id: string; reason: string; status: string; created_at: string };
type Disposition = { id: string; disposition_type: string; payload: Record<string, unknown>; created_at: string };
type Amendment = { id: string; reason: string; created_at: string; correction_id: string | null; payload: Record<string, unknown> };
type EventRow = {
  client_enabled_test_id: string;
  result?: string | null;
  action_lookup_id?: string | null;
  comments?: string | null;
};
type EnabledTest = {
  id: string;
  task_name: string;
  test_number: number;
  applicability_label: string;
  qualifies_conductor_annual?: boolean;
  qualifies_engineer_annual?: boolean;
  qualifies_engineer_check_ride?: boolean;
};

type Props = {
  event: Record<string, unknown>;
  managers: Manager[];
  locations: Location[];
  employees: Employee[];
  lookups: Lookup[];
  corrections: Correction[];
  dispositions: Disposition[];
  amendments: Amendment[];
  canApplyAmendments: boolean;
};

type AmendmentRowDraft = {
  result: "" | "pass" | "fail";
  actionLookupId: string;
  comments: string;
};

function makeInitialRowDrafts(event: Record<string, unknown>, enabledTestsById: Record<string, EnabledTest>) {
  return Object.fromEntries(
    Object.values(enabledTestsById).map((test) => {
      const row = ((event.rows as EventRow[]) ?? []).find((candidate) => String(candidate.client_enabled_test_id) === String(test.id));
      return [String(test.id), {
        result: ((row?.result ?? "") as "" | "pass" | "fail"),
        actionLookupId: String(row?.action_lookup_id ?? ""),
        comments: String(row?.comments ?? ""),
      }];
    }),
  ) as Record<string, AmendmentRowDraft>;
}

export function TestingEventDetail({
  event,
  managers,
  locations,
  employees,
  lookups,
  corrections,
  dispositions,
  amendments,
  canApplyAmendments,
}: Props) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [notificationNotes, setNotificationNotes] = useState("");
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
  const [notificationMethodId, setNotificationMethodId] = useState(String(event.notification_method_lookup_id ?? ""));

  const enabledTestsById = ((event.enabledTestsById as Record<string, EnabledTest>) ?? {});
  const failureActions = lookups.filter((candidate) => candidate.lookup_type === "failure_action");
  const methods = lookups.filter((candidate) => candidate.lookup_type === "method");
  const observationTypes = lookups.filter((candidate) => candidate.lookup_type === "observation_type");
  const duties = lookups.filter((candidate) => candidate.lookup_type === "duty");
  const notificationMethods = lookups.filter((candidate) => candidate.lookup_type === "notification_method");

  const [amendmentReason, setAmendmentReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [linkedCorrectionId, setLinkedCorrectionId] = useState("");
  const [amendmentBusy, setAmendmentBusy] = useState(false);
  const [amendmentMessage, setAmendmentMessage] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState(String(event.employee_id ?? ""));
  const [manager1Id, setManager1Id] = useState(String(event.manager_1_id ?? ""));
  const [manager2Id, setManager2Id] = useState(String(event.manager_2_id ?? ""));
  const [locationId, setLocationId] = useState(String(event.location_id ?? ""));
  const [subLocation, setSubLocation] = useState(String(event.sub_location ?? ""));
  const [engineNumber, setEngineNumber] = useState(String(event.engine_number ?? ""));
  const [jobId, setJobId] = useState(String(event.job_id ?? ""));
  const [methodLookupId, setMethodLookupId] = useState(String(event.method_lookup_id ?? ""));
  const [observationTypeLookupId, setObservationTypeLookupId] = useState(String(event.observation_type_lookup_id ?? ""));
  const [dutyLookupId, setDutyLookupId] = useState(String(event.duty_lookup_id ?? ""));
  const [eventDate, setEventDate] = useState(String(event.event_date ?? ""));
  const [eventTime, setEventTime] = useState(String(event.event_time ?? ""));
  const [conditions, setConditions] = useState<string[]>(((event.conditions as string[]) ?? []));
  const [notificationStatus, setNotificationStatus] = useState<"pending" | "completed">(String(event.notification_status ?? "pending") === "completed" ? "completed" : "pending");
  const [notificationMethodLookupId, setNotificationMethodLookupId] = useState(String(event.notification_method_lookup_id ?? ""));
  const [generalComments, setGeneralComments] = useState(String(event.general_comments ?? ""));
  const [rowDrafts, setRowDrafts] = useState<Record<string, AmendmentRowDraft>>(() => makeInitialRowDrafts(event, enabledTestsById));

  const employee = employees.find((candidate) => candidate.id === String(event.employee_id));
  const manager1 = managers.find((candidate) => candidate.id === String(event.manager_1_id ?? ""));
  const manager2 = managers.find((candidate) => candidate.id === String(event.manager_2_id ?? ""));
  const location = locations.find((candidate) => candidate.id === String(event.location_id ?? ""));
  const notificationMethod = lookups.find((candidate) => candidate.id === String(event.notification_method_lookup_id ?? ""));
  const currentNotificationStatus = String(event.currentNotificationStatus ?? event.notification_status ?? "pending");
  const openCorrections = corrections.filter((candidate) => candidate.status === "requested");

  const selectedEmployee = employees.find((candidate) => candidate.id === employeeId) ?? null;

  const amendmentRowsChanged = useMemo(
    () =>
      Object.entries(rowDrafts).some(([testId, draft]) => {
        const original = ((event.rows as EventRow[]) ?? []).find((candidate) => String(candidate.client_enabled_test_id) === testId);
        return (
          draft.result !== String(original?.result ?? "") ||
          draft.actionLookupId !== String(original?.action_lookup_id ?? "") ||
          draft.comments.trim() !== String(original?.comments ?? "")
        );
      }),
    [event.rows, rowDrafts],
  );

  const amendmentEventChanged =
    employeeId !== String(event.employee_id ?? "") ||
    manager1Id !== String(event.manager_1_id ?? "") ||
    manager2Id !== String(event.manager_2_id ?? "") ||
    locationId !== String(event.location_id ?? "") ||
    subLocation !== String(event.sub_location ?? "") ||
    engineNumber !== String(event.engine_number ?? "") ||
    jobId !== String(event.job_id ?? "") ||
    methodLookupId !== String(event.method_lookup_id ?? "") ||
    observationTypeLookupId !== String(event.observation_type_lookup_id ?? "") ||
    dutyLookupId !== String(event.duty_lookup_id ?? "") ||
    eventDate !== String(event.event_date ?? "") ||
    eventTime !== String(event.event_time ?? "") ||
    notificationStatus !== String(event.notification_status ?? "pending") ||
    notificationMethodLookupId !== String(event.notification_method_lookup_id ?? "") ||
    generalComments !== String(event.general_comments ?? "") ||
    conditions.join("|") !== ((event.conditions as string[]) ?? []).join("|");

  function updateRow(testId: string, patch: Partial<AmendmentRowDraft>) {
    setRowDrafts((current) => ({ ...current, [testId]: { ...current[testId], ...patch } }));
  }

  function toggleCondition(value: string) {
    setConditions((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  async function requestCorrection() {
    setBusy(true);
    setMessage(null);

    const response = await fetch(`/api/testing-events/${String(event.id)}/corrections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setBusy(false);
      setMessage(payload?.error ?? "Could not request correction.");
      return;
    }

    window.location.reload();
  }

  async function applyAmendment() {
    setAmendmentBusy(true);
    setAmendmentMessage(null);

    const eventPatch: Record<string, unknown> = {};
    const rowPatches: Record<string, Record<string, unknown>> = {};

    const fieldMap: Array<[string, unknown, unknown]> = [
      ["employee_id", employeeId || null, event.employee_id ?? null],
      ["manager_1_id", manager1Id || null, event.manager_1_id ?? null],
      ["manager_2_id", manager2Id || null, event.manager_2_id ?? null],
      ["location_id", locationId || null, event.location_id ?? null],
      ["sub_location", subLocation.trim() || null, event.sub_location ?? null],
      ["engine_number", engineNumber.trim() || null, event.engine_number ?? null],
      ["job_id", jobId.trim() || null, event.job_id ?? null],
      ["method_lookup_id", methodLookupId || null, event.method_lookup_id ?? null],
      ["observation_type_lookup_id", observationTypeLookupId || null, event.observation_type_lookup_id ?? null],
      ["duty_lookup_id", dutyLookupId || null, event.duty_lookup_id ?? null],
      ["event_date", eventDate, event.event_date ?? ""],
      ["event_time", eventTime.trim() || null, event.event_time ?? null],
      ["notification_status", notificationStatus, event.notification_status ?? "pending"],
      ["notification_method_lookup_id", notificationMethodLookupId || null, event.notification_method_lookup_id ?? null],
      ["general_comments", generalComments.trim() || null, event.general_comments ?? null],
    ];

    for (const [key, nextValue, currentValue] of fieldMap) {
      if (String(nextValue ?? "") !== String(currentValue ?? "")) {
        eventPatch[key] = nextValue;
      }
    }

    if (conditions.join("|") !== ((event.conditions as string[]) ?? []).join("|")) {
      eventPatch.conditions = conditions;
    }

    for (const [testId, draft] of Object.entries(rowDrafts)) {
      const original = ((event.rows as EventRow[]) ?? []).find((candidate) => String(candidate.client_enabled_test_id) === testId);
      const result = draft.result || null;
      const actionLookupId = draft.result === "fail" ? (draft.actionLookupId || null) : null;
      const comments = draft.comments.trim() || null;

      if (result === "fail" && !actionLookupId) {
        setAmendmentBusy(false);
        setAmendmentMessage(`Each failed amended row requires an action. Test ${enabledTestsById[testId]?.test_number ?? testId}.`);
        return;
      }

      if (result === "fail" && !comments) {
        setAmendmentBusy(false);
        setAmendmentMessage(`Each failed amended row requires a comment. Test ${enabledTestsById[testId]?.test_number ?? testId}.`);
        return;
      }

      if (
        result !== (original?.result ?? null) ||
        actionLookupId !== (original?.action_lookup_id ?? null) ||
        comments !== (original?.comments ?? null)
      ) {
        rowPatches[testId] = {
          result,
          action_lookup_id: actionLookupId,
          comments,
        };
      }
    }

    if (!amendmentReason.trim()) {
      setAmendmentBusy(false);
      setAmendmentMessage("Amendment reason is required.");
      return;
    }

    if (Object.keys(eventPatch).length === 0 && Object.keys(rowPatches).length === 0) {
      setAmendmentBusy(false);
      setAmendmentMessage("No amendment changes were detected.");
      return;
    }

    const response = await fetch(`/api/testing-events/${String(event.id)}/amendments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        correctionId: linkedCorrectionId || undefined,
        reason: amendmentReason,
        adminNotes,
        eventPatch,
        rowPatches,
      }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setAmendmentBusy(false);
      setAmendmentMessage(payload?.error ?? "Could not apply amendment.");
      return;
    }

    window.location.reload();
  }

  async function completeNotification() {
    setNotificationBusy(true);
    setNotificationMessage(null);

    const methodLabel = notificationMethods.find((candidate) => candidate.id === notificationMethodId)?.label ?? "";
    if (!methodLabel) {
      setNotificationBusy(false);
      setNotificationMessage("Choose a notification method before completing notification.");
      return;
    }

    const response = await fetch(`/api/testing-events/${String(event.id)}/notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        methodLabel,
        notes: notificationNotes,
      }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setNotificationBusy(false);
      setNotificationMessage(payload?.error ?? "Could not complete notification.");
      return;
    }

    window.location.reload();
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <section className="panel" style={{ padding: "1.5rem" }}>
        <div className="eyebrow">Certified Record</div>
        <h1 className="title-lg">{String(event.control_number)}</h1>
        <p className="text-muted" style={{ margin: "0.75rem 0 0" }}>
          Status: <strong>{String(event.status).replace(/_/g, " ")}</strong>
        </p>
      </section>

      <section className="panel form-shell">
        <div className="paper-title">OPERATIONAL TESTING (217.9 PROGRAM)</div>
        <div className="paper-grid">
          <div className="field-label"><span>Date</span><div className="print-field">{String(event.event_date)}</div></div>
          <div className="field-label"><span>Time</span><div className="print-field">{String(event.event_time ?? "")}</div></div>
          <div className="field-label paper-span-full"><span>Location</span><div className="print-field">{location?.name ?? ""}</div></div>
          <div className="field-label"><span>Sub-location</span><div className="print-field">{String(event.sub_location ?? "")}</div></div>
          <div className="field-label"><span>Engine #</span><div className="print-field">{String(event.engine_number ?? "")}</div></div>
          <div className="field-label"><span>Job ID</span><div className="print-field">{String(event.job_id ?? "")}</div></div>
          <div className="field-label"><span>Test Mgr 1</span><div className="print-field">{manager1?.display_name ?? ""}</div></div>
          <div className="field-label"><span>Test Mgr 2</span><div className="print-field">{manager2?.display_name ?? ""}</div></div>
          <div className="field-label paper-span-full"><span>Conditions</span><div className="print-field">{((event.conditions as string[]) ?? []).join(", ")}</div></div>
          <div className="field-label paper-span-full"><span>Employee</span><div className="print-field">{employee ? `${employee.last_name}, ${employee.first_name}` : ""}</div></div>
          <div className="field-label"><span>Emp ID</span><div className="print-field">{employee?.employee_number ?? ""}</div></div>
          <div className="field-label"><span>Notified</span><div className="print-field">{currentNotificationStatus}</div></div>
          <div className="field-label"><span>Notification Method</span><div className="print-field">{notificationMethod?.label ?? ""}</div></div>
        </div>
      </section>

      <section className="panel" style={{ padding: "1rem" }}>
        <div className="eyebrow">Task Table</div>
        <div style={{ overflowX: "auto", marginTop: "0.8rem" }}>
          <table className="data-table form-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Test #</th>
                <th>Applicable For</th>
                <th>Pass-Fail</th>
                <th>Action Taken</th>
                <th>Comments</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(enabledTestsById).map((test) => {
                const row = ((event.rows as EventRow[]) ?? []).find((candidate) => String(candidate.client_enabled_test_id) === String(test.id));
                const qualifiesLabel = test.qualifies_engineer_check_ride
                  ? "Engineer Annual / Check Ride"
                  : test.qualifies_engineer_annual
                    ? "Engineer Annual"
                    : test.qualifies_conductor_annual
                      ? "Conductor Annual"
                      : null;
                const actionLabel = lookups.find((candidate) => candidate.id === String(row?.action_lookup_id ?? ""))?.label ?? "";

                return (
                  <tr key={String(test.id)}>
                    <td><div style={{ fontWeight: 700 }}>{String(test.task_name)}</div>{qualifiesLabel ? <div className="qualifying-flag">{qualifiesLabel}</div> : null}</td>
                    <td>{String(test.test_number)}</td>
                    <td>{String(test.applicability_label)}</td>
                    <td>{String(row?.result ?? "")}</td>
                    <td>{actionLabel}</td>
                    <td>{String(row?.comments ?? "")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel" style={{ padding: "1rem" }}>
        <div className="eyebrow">Amendments</div>
        <div style={{ marginTop: "0.9rem", display: "grid", gap: "0.75rem" }}>
          {corrections.length === 0 && dispositions.length === 0 && amendments.length === 0 ? <p className="text-muted" style={{ margin: 0 }}>No correction requests, amendments, or follow-up dispositions have been recorded yet.</p> : null}
          {corrections.map((correction) => (
            <div className="panel-muted" key={correction.id} style={{ padding: "0.85rem 0.95rem" }}>
              <div style={{ fontWeight: 700 }}>Correction request</div>
              <div className="text-muted" style={{ marginTop: "0.2rem" }}>{correction.reason}</div>
              <div className="text-muted" style={{ marginTop: "0.2rem" }}>{correction.status} | {new Date(correction.created_at).toLocaleString()}</div>
            </div>
          ))}
          {amendments.map((amendment) => (
            <div className="panel-muted" key={amendment.id} style={{ padding: "0.85rem 0.95rem" }}>
              <div style={{ fontWeight: 700 }}>Approved amendment</div>
              <div className="text-muted" style={{ marginTop: "0.2rem" }}>{amendment.reason}</div>
              <div className="text-muted" style={{ marginTop: "0.2rem" }}>Linked correction: {amendment.correction_id ?? "none"} | {new Date(amendment.created_at).toLocaleString()}</div>
            </div>
          ))}
          {dispositions.map((disposition) => (
            <div className="panel-muted" key={disposition.id} style={{ padding: "0.85rem 0.95rem" }}>
              <div style={{ fontWeight: 700 }}>{disposition.disposition_type}</div>
              <div className="text-muted" style={{ marginTop: "0.2rem" }}>{JSON.stringify(disposition.payload)}</div>
              <div className="text-muted" style={{ marginTop: "0.2rem" }}>{new Date(disposition.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </section>

      {canApplyAmendments ? (
        <section className="panel" style={{ padding: "1.25rem", display: "grid", gap: "1rem" }}>
          <div className="eyebrow">Apply Amendment</div>
          <div className="form-two-col">
            <label className="field-label">
              <span>Link to correction request</span>
              <select className="field-select" value={linkedCorrectionId} onChange={(event) => setLinkedCorrectionId(event.target.value)}>
                <option value="">No linked request</option>
                {openCorrections.map((correction) => (
                  <option key={correction.id} value={correction.id}>{new Date(correction.created_at).toLocaleDateString()} - {correction.reason}</option>
                ))}
              </select>
            </label>
            <label className="field-label">
              <span>Amendment reason</span>
              <input className="field-input" value={amendmentReason} onChange={(event) => setAmendmentReason(event.target.value)} />
            </label>
          </div>

          <label className="field-label">
            <span>Admin notes</span>
            <textarea className="field-textarea" value={adminNotes} onChange={(event) => setAdminNotes(event.target.value)} />
          </label>

          <div className="paper-grid">
            <label className="field-label"><span>Date</span><input className="field-input" type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} /></label>
            <label className="field-label"><span>Time</span><input className="field-input" value={eventTime} onChange={(event) => setEventTime(event.target.value)} /></label>
            <label className="field-label paper-span-full"><span>Location</span><select className="field-select" value={locationId} onChange={(event) => setLocationId(event.target.value)}><option value="">Select a location</option>{locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="field-label"><span>Sub-location</span><input className="field-input" value={subLocation} onChange={(event) => setSubLocation(event.target.value)} /></label>
            <label className="field-label"><span>Engine #</span><input className="field-input" value={engineNumber} onChange={(event) => setEngineNumber(event.target.value)} /></label>
            <label className="field-label"><span>Job ID</span><input className="field-input" value={jobId} onChange={(event) => setJobId(event.target.value)} /></label>
            <label className="field-label"><span>Test Mgr 1</span><select className="field-select" value={manager1Id} onChange={(event) => setManager1Id(event.target.value)}><option value="">Select manager</option>{managers.map((item) => <option key={item.id} value={item.id}>{item.display_name}</option>)}</select></label>
            <label className="field-label"><span>Test Mgr 2</span><select className="field-select" value={manager2Id} onChange={(event) => setManager2Id(event.target.value)}><option value="">Optional</option>{managers.map((item) => <option key={item.id} value={item.id}>{item.display_name}</option>)}</select></label>
            <div className="field-label paper-span-full"><span>Conditions</span><div className="condition-grid">{CONDITION_OPTIONS.map((condition) => <label className="checkbox-row" key={condition}><input checked={conditions.includes(condition)} onChange={() => toggleCondition(condition)} type="checkbox" />{labelForCondition(condition)}</label>)}</div></div>
            <label className="field-label"><span>Method</span><select className="field-select" value={methodLookupId} onChange={(event) => setMethodLookupId(event.target.value)}><option value="">Select method</option>{methods.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
            <label className="field-label"><span>Obs Type</span><select className="field-select" value={observationTypeLookupId} onChange={(event) => setObservationTypeLookupId(event.target.value)}><option value="">Select type</option>{observationTypes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
            <label className="field-label paper-span-full"><span>Employee</span><select className="field-select" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}><option value="">Select employee</option>{employees.map((item) => <option key={item.id} value={item.id}>{item.last_name}, {item.first_name} ({item.employee_number})</option>)}</select></label>
            <label className="field-label"><span>Emp ID</span><input className="field-input" disabled value={selectedEmployee?.employee_number ?? ""} /></label>
            <label className="field-label"><span>Emp Duties</span><select className="field-select" value={dutyLookupId} onChange={(event) => setDutyLookupId(event.target.value)}><option value="">Select duty</option>{duties.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
            <label className="field-label"><span>Notified</span><select className="field-select" value={notificationStatus} onChange={(event) => setNotificationStatus(event.target.value as "pending" | "completed")}><option value="pending">Pending</option><option value="completed">Completed</option></select></label>
            <label className="field-label"><span>Notification Method</span><select className="field-select" value={notificationMethodLookupId} onChange={(event) => setNotificationMethodLookupId(event.target.value)}><option value="">Optional</option>{notificationMethods.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          </div>

          <label className="field-label">
            <span>General comments</span>
            <textarea className="field-textarea" value={generalComments} onChange={(event) => setGeneralComments(event.target.value)} />
          </label>

          <div style={{ overflowX: "auto" }}>
            <table className="data-table form-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Test #</th>
                  <th>Applicable For</th>
                  <th>Pass-Fail</th>
                  <th>Action Taken</th>
                  <th>Comments</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(enabledTestsById).map((test) => {
                  const row = rowDrafts[String(test.id)];
                  const qualifiesLabel = test.qualifies_engineer_check_ride
                    ? "Engineer Annual / Check Ride"
                    : test.qualifies_engineer_annual
                      ? "Engineer Annual"
                      : test.qualifies_conductor_annual
                        ? "Conductor Annual"
                        : null;
                  return (
                    <tr key={String(test.id)}>
                      <td><div style={{ fontWeight: 700 }}>{String(test.task_name)}</div>{qualifiesLabel ? <div className="qualifying-flag">{qualifiesLabel}</div> : null}</td>
                      <td>{String(test.test_number)}</td>
                      <td>{String(test.applicability_label)}</td>
                      <td><select className="field-select" value={row.result} onChange={(event) => updateRow(String(test.id), { result: event.target.value as AmendmentRowDraft["result"], actionLookupId: event.target.value === "fail" ? row.actionLookupId : "" })}><option value="">Blank</option><option value="pass">Pass</option><option value="fail">Fail</option></select></td>
                      <td><select className="field-select" disabled={row.result !== "fail"} value={row.actionLookupId} onChange={(event) => updateRow(String(test.id), { actionLookupId: event.target.value })}><option value="">Select action</option>{failureActions.map((action) => <option key={action.id} value={action.id}>{action.label}</option>)}</select></td>
                      <td><textarea className="field-textarea compact-textarea" value={row.comments} onChange={(event) => updateRow(String(test.id), { comments: event.target.value })} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="text-muted">
            Changes detected: {amendmentEventChanged || amendmentRowsChanged ? "yes" : "no"}
          </div>
          <button className="button-primary" disabled={amendmentBusy} onClick={() => void applyAmendment()} type="button">
            {amendmentBusy ? "Applying..." : "Apply Amendment"}
          </button>
          {amendmentMessage ? <div className="message message-error">{amendmentMessage}</div> : null}
        </section>
      ) : null}

      {canApplyAmendments && currentNotificationStatus !== "completed" ? (
        <section className="panel" style={{ padding: "1.25rem", display: "grid", gap: "1rem" }}>
          <div className="eyebrow">Complete Notification</div>
          <div className="form-two-col">
            <label className="field-label">
              <span>Notification method</span>
              <select className="field-select" value={notificationMethodId} onChange={(event) => setNotificationMethodId(event.target.value)}>
                <option value="">Select method</option>
                {notificationMethods.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <label className="field-label">
              <span>Notes</span>
              <input className="field-input" value={notificationNotes} onChange={(event) => setNotificationNotes(event.target.value)} />
            </label>
          </div>
          <button className="button-secondary" disabled={notificationBusy} onClick={() => void completeNotification()} type="button">
            {notificationBusy ? "Saving..." : "Mark Notification Completed"}
          </button>
          {notificationMessage ? <div className="message message-error">{notificationMessage}</div> : null}
        </section>
      ) : null}

      <section className="panel" style={{ padding: "1.25rem", display: "grid", gap: "1rem" }}>
        <div className="eyebrow">Request Correction</div>
        <label className="field-label">
          <span>Reason for correction</span>
          <textarea className="field-textarea" value={reason} onChange={(event) => setReason(event.target.value)} />
        </label>
        <button className="button-secondary" disabled={busy || !reason.trim()} onClick={() => void requestCorrection()} type="button">
          {busy ? "Submitting..." : "Request Correction"}
        </button>
        {message ? <div className="message message-error">{message}</div> : null}
      </section>
    </div>
  );
}
