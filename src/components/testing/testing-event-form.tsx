"use client";

import { useMemo, useState } from "react";
import { CONDITION_OPTIONS, labelForCondition } from "@/lib/operations";

type Option = { id: string; label: string };
type Employee = { id: string; employee_number: string; first_name: string; last_name: string; status: string };
type EnabledTest = {
  id: string;
  test_number: number;
  task_name: string;
  applicability_label: string;
  qualifies_conductor_annual: boolean;
  qualifies_engineer_annual: boolean;
  qualifies_engineer_check_ride: boolean;
};
type ExistingEvent = {
  id: string;
  employee_id: string;
  manager_1_id: string | null;
  manager_2_id: string | null;
  location_id: string | null;
  sub_location: string | null;
  engine_number: string | null;
  job_id: string | null;
  method_lookup_id: string | null;
  observation_type_lookup_id: string | null;
  duty_lookup_id: string | null;
  event_date: string;
  event_time: string | null;
  conditions: string[];
  general_comments: string | null;
  notification_status: "pending" | "completed";
  notification_method_lookup_id: string | null;
  rows: Array<{
    client_enabled_test_id: string;
    result: "pass" | "fail" | null;
    action_lookup_id: string | null;
    comments: string | null;
  }>;
};

type Props = {
  employees: Employee[];
  managers: Option[];
  locations: Option[];
  methods: Option[];
  observationTypes: Option[];
  duties: Option[];
  notificationMethods: Option[];
  failureActions: Option[];
  enabledTests: EnabledTest[];
  existingEvent?: ExistingEvent | null;
};

type RowDraft = { result: "" | "pass" | "fail"; actionLookupId: string; comments: string };

function buildInitialRows(enabledTests: EnabledTest[], existingEvent?: ExistingEvent | null) {
  return Object.fromEntries(
    enabledTests.map((test) => {
      const current = existingEvent?.rows.find((row) => row.client_enabled_test_id === test.id);
      return [test.id, { result: (current?.result ?? "") as RowDraft["result"], actionLookupId: current?.action_lookup_id ?? "", comments: current?.comments ?? "" }];
    }),
  ) as Record<string, RowDraft>;
}

export function TestingEventForm(props: Props) {
  const { employees, managers, locations, methods, observationTypes, duties, notificationMethods, failureActions, enabledTests, existingEvent } = props;
  const [employeeQuery, setEmployeeQuery] = useState(
    existingEvent
      ? (() => {
          const employee = employees.find((candidate) => candidate.id === existingEvent.employee_id);
          return employee ? `${employee.last_name}, ${employee.first_name} (${employee.employee_number})` : "";
        })()
      : "",
  );
  const [employeeId, setEmployeeId] = useState(existingEvent?.employee_id ?? "");
  const [manager1Id, setManager1Id] = useState(existingEvent?.manager_1_id ?? "");
  const [manager2Id, setManager2Id] = useState(existingEvent?.manager_2_id ?? "");
  const [locationId, setLocationId] = useState(existingEvent?.location_id ?? "");
  const [subLocation, setSubLocation] = useState(existingEvent?.sub_location ?? "");
  const [engineNumber, setEngineNumber] = useState(existingEvent?.engine_number ?? "");
  const [jobId, setJobId] = useState(existingEvent?.job_id ?? "");
  const [methodLookupId, setMethodLookupId] = useState(existingEvent?.method_lookup_id ?? "");
  const [observationTypeLookupId, setObservationTypeLookupId] = useState(existingEvent?.observation_type_lookup_id ?? "");
  const [dutyLookupId, setDutyLookupId] = useState(existingEvent?.duty_lookup_id ?? "");
  const [eventDate, setEventDate] = useState(existingEvent?.event_date ?? new Date().toISOString().slice(0, 10));
  const [eventTime, setEventTime] = useState(existingEvent?.event_time ?? "");
  const [conditions, setConditions] = useState<string[]>(existingEvent?.conditions ?? []);
  const [notificationStatus, setNotificationStatus] = useState<"pending" | "completed">(existingEvent?.notification_status ?? "pending");
  const [notificationMethodLookupId, setNotificationMethodLookupId] = useState(existingEvent?.notification_method_lookup_id ?? "");
  const [generalComments, setGeneralComments] = useState(existingEvent?.general_comments ?? "");
  const [rows, setRows] = useState<Record<string, RowDraft>>(() => buildInitialRows(enabledTests, existingEvent));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const filteredEmployees = useMemo(() => {
    const needle = employeeQuery.trim().toLowerCase();
    if (!needle) return employees.slice(0, 10);
    return employees.filter((employee) => `${employee.last_name} ${employee.first_name} ${employee.employee_number}`.toLowerCase().includes(needle)).slice(0, 10);
  }, [employeeQuery, employees]);

  const selectedEmployee = employees.find((employee) => employee.id === employeeId) ?? null;

  function selectEmployee(nextEmployeeId: string) {
    setEmployeeId(nextEmployeeId);
    const employee = employees.find((candidate) => candidate.id === nextEmployeeId);
    if (employee) {
      setEmployeeQuery(`${employee.last_name}, ${employee.first_name} (${employee.employee_number})`);
    }
  }

  function toggleCondition(value: string) {
    setConditions((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  function updateRow(testId: string, patch: Partial<RowDraft>) {
    setRows((current) => ({ ...current, [testId]: { ...current[testId], ...patch } }));
  }

  async function persist(mode: "draft" | "submit") {
    setBusy(true);
    setMessage(null);

    const response = await fetch("/api/testing-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: existingEvent?.id,
        employeeId, manager1Id, manager2Id, locationId, subLocation, engineNumber, jobId,
        methodLookupId, observationTypeLookupId, dutyLookupId, eventDate, eventTime, conditions,
        notificationStatus, notificationMethodLookupId, generalComments,
        rows: enabledTests.map((test, index) => ({
          clientEnabledTestId: test.id,
          rowOrder: index,
          result: rows[test.id].result,
          actionLookupId: rows[test.id].actionLookupId,
          comments: rows[test.id].comments,
        })),
      }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string; data?: { eventId: string } } | null;
    if (!response.ok || !payload?.data?.eventId) {
      setBusy(false);
      setMessage(payload?.error ?? "Could not save testing event.");
      return;
    }

    if (mode === "draft") {
      window.location.href = `/testing/${payload.data.eventId}`;
      return;
    }

    const confirmSubmit = window.confirm("Finalize and lock this record? After submission, the original certified event cannot be edited in place.");
    if (!confirmSubmit) {
      setBusy(false);
      return;
    }

    const submitResponse = await fetch(`/api/testing-events/${payload.data.eventId}/submit`, { method: "POST" });
    const submitPayload = (await submitResponse.json().catch(() => null)) as { error?: string } | null;
    if (!submitResponse.ok) {
      setBusy(false);
      setMessage(submitPayload?.error ?? "Could not submit testing event.");
      return;
    }

    window.location.href = `/testing/${payload.data.eventId}`;
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <section className="panel form-shell">
        <div className="paper-header">
          <div>
            <div className="paper-kicker">49 CFR 217.9</div>
            <div className="paper-title">Operational Testing Record</div>
          </div>
          <div className="paper-control-box">
            <div className="paper-control-label">Status</div>
            <div className="paper-control-value">{existingEvent ? "Draft Revision" : "Draft Entry"}</div>
          </div>
        </div>

        <div className="paper-section-title">Event Header</div>
        <div className="paper-grid paper-grid-tight">
          <label className="field-label"><span>Date</span><input className="field-input form-paper-input" type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} required /></label>
          <label className="field-label"><span>Time</span><input className="field-input form-paper-input" value={eventTime} onChange={(event) => setEventTime(event.target.value)} placeholder="1530" /></label>
          <label className="field-label paper-span-full"><span>Location</span><select className="field-select form-paper-input" value={locationId} onChange={(event) => setLocationId(event.target.value)} required><option value="">Select a location</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.label}</option>)}</select></label>
          <label className="field-label"><span>Sub-location</span><input className="field-input form-paper-input" value={subLocation} onChange={(event) => setSubLocation(event.target.value)} /></label>
          <label className="field-label"><span>Engine #</span><input className="field-input form-paper-input" value={engineNumber} onChange={(event) => setEngineNumber(event.target.value)} /></label>
          <label className="field-label"><span>Job ID</span><input className="field-input form-paper-input" value={jobId} onChange={(event) => setJobId(event.target.value)} /></label>
          <label className="field-label"><span>Test Mgr 1</span><select className="field-select form-paper-input" value={manager1Id} onChange={(event) => setManager1Id(event.target.value)} required><option value="">Select manager</option>{managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.label}</option>)}</select></label>
          <label className="field-label"><span>Test Mgr 2</span><select className="field-select form-paper-input" value={manager2Id} onChange={(event) => setManager2Id(event.target.value)}><option value="">Optional</option>{managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.label}</option>)}</select></label>
          <div className="field-label paper-span-full paper-box-field"><span>Conditions</span><div className="condition-grid">{CONDITION_OPTIONS.map((condition) => <label className="checkbox-row" key={condition}><input checked={conditions.includes(condition)} onChange={() => toggleCondition(condition)} type="checkbox" />{labelForCondition(condition)}</label>)}</div></div>
          <label className="field-label"><span>Method</span><select className="field-select form-paper-input" value={methodLookupId} onChange={(event) => setMethodLookupId(event.target.value)} required><option value="">Select method</option>{methods.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
          <label className="field-label"><span>Obs Type</span><select className="field-select form-paper-input" value={observationTypeLookupId} onChange={(event) => setObservationTypeLookupId(event.target.value)} required><option value="">Select type</option>{observationTypes.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
        </div>

        <div className="paper-section-title">Employee</div>
        <div className="paper-grid paper-grid-tight">
          <label className="field-label paper-span-full">
            <span>Employee search</span>
            <input
              className="field-input form-paper-input"
              value={employeeQuery}
              onChange={(event) => {
                const value = event.target.value;
                setEmployeeQuery(value);
                const needle = value.trim().toLowerCase();
                if (!needle) {
                  setEmployeeId("");
                  return;
                }
                const firstMatch = employees.find((employee) =>
                  `${employee.last_name} ${employee.first_name} ${employee.employee_number}`.toLowerCase().includes(needle),
                );
                if (firstMatch) {
                  setEmployeeId(firstMatch.id);
                }
              }}
              placeholder="Start typing name or ID"
            />
          </label>
          {employeeQuery.trim() ? (
            <div className="field-label paper-span-full">
              <span>Matching employees</span>
              <div className="search-results">
                {filteredEmployees.length === 0 ? (
                  <div className="search-result-empty">No employee matches that search.</div>
                ) : filteredEmployees.map((employee) => {
                  const label = `${employee.last_name}, ${employee.first_name} (${employee.employee_number})${employee.status !== "active" ? " - inactive" : ""}`;
                  return (
                    <button
                      className={`search-result${employee.id === employeeId ? " search-result-active" : ""}`}
                      key={employee.id}
                      onClick={() => selectEmployee(employee.id)}
                      type="button"
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          <label className="field-label paper-span-full"><span>Employee</span><select className="field-select form-paper-input" value={employeeId} onChange={(event) => selectEmployee(event.target.value)} required><option value="">Select employee</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.last_name}, {employee.first_name} ({employee.employee_number}){employee.status !== "active" ? " - inactive" : ""}</option>)}</select></label>
          <label className="field-label"><span>Emp ID</span><input className="field-input form-paper-input" value={selectedEmployee?.employee_number ?? ""} disabled /></label>
          <label className="field-label"><span>Emp Duties</span><select className="field-select form-paper-input" value={dutyLookupId} onChange={(event) => setDutyLookupId(event.target.value)} required><option value="">Select duty</option>{duties.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
          <label className="field-label"><span>Notified</span><select className="field-select form-paper-input" value={notificationStatus} onChange={(event) => setNotificationStatus(event.target.value as "pending" | "completed")}><option value="pending">Pending</option><option value="completed">Completed</option></select></label>
          <label className="field-label"><span>Notification Method</span><select className="field-select form-paper-input" value={notificationMethodLookupId} onChange={(event) => setNotificationMethodLookupId(event.target.value)}><option value="">Optional</option>{notificationMethods.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
        </div>
      </section>

      <section className="panel form-shell" style={{ padding: "1rem" }}>
        <div className="paper-section-title">Observed Tests</div>
        <div style={{ overflowX: "auto", marginTop: "0.8rem" }}>
          <table className="data-table form-table paper-table">
            <thead><tr><th>Task</th><th>Test #</th><th>Applicable For</th><th>Pass-Fail</th><th>Action Taken</th><th>Comments</th></tr></thead>
            <tbody>
              {enabledTests.map((test) => {
                const row = rows[test.id];
                const qualifiesLabel = test.qualifies_engineer_check_ride ? "Engineer Annual / Check Ride" : test.qualifies_engineer_annual ? "Engineer Annual" : test.qualifies_conductor_annual ? "Conductor Annual" : null;
                return (
                  <tr key={test.id}>
                    <td><div className="paper-task-name">{test.task_name}</div>{qualifiesLabel ? <div className="qualifying-flag">{qualifiesLabel}</div> : null}</td>
                    <td>{test.test_number}</td>
                    <td>{test.applicability_label}</td>
                    <td><select className="field-select form-paper-select" value={row.result} onChange={(event) => updateRow(test.id, { result: event.target.value as RowDraft["result"], actionLookupId: event.target.value === "fail" ? row.actionLookupId : "" })}><option value="">Blank</option><option value="pass">Pass</option><option value="fail">Fail</option></select></td>
                    <td><select className="field-select form-paper-select" disabled={row.result !== "fail"} value={row.actionLookupId} onChange={(event) => updateRow(test.id, { actionLookupId: event.target.value })}><option value="">Select action</option>{failureActions.map((action) => <option key={action.id} value={action.id}>{action.label}</option>)}</select></td>
                    <td><textarea className="field-textarea compact-textarea form-paper-textarea" value={row.comments} onChange={(event) => updateRow(test.id, { comments: event.target.value })} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel form-shell" style={{ padding: "1.25rem", display: "grid", gap: "1rem" }}>
        <div className="paper-section-title">Record Notes</div>
        <label className="field-label"><span>Comments</span><textarea className="field-textarea form-paper-textarea" value={generalComments} onChange={(event) => setGeneralComments(event.target.value)} /></label>
        <div className="button-row">
          <button className="button-secondary" disabled={busy} onClick={() => void persist("draft")} type="button">{busy ? "Saving..." : existingEvent ? "Save Draft Changes" : "Save Draft"}</button>
          <button className="button-primary" disabled={busy} onClick={() => void persist("submit")} type="button">{busy ? "Submitting..." : "Submit and Lock"}</button>
        </div>
        {message ? <div className="message message-error">{message}</div> : null}
      </section>
    </div>
  );
}
