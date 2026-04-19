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
    return employees
      .filter((employee) => `${employee.last_name} ${employee.first_name} ${employee.employee_number}`.toLowerCase().includes(needle))
      .slice(0, 10);
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
    setConditions((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  }

  function updateRow(testId: string, patch: Partial<RowDraft>) {
    setRows((current) => ({ ...current, [testId]: { ...current[testId], ...patch } }));
  }

  function setRowResult(testId: string, nextResult: RowDraft["result"]) {
    updateRow(testId, {
      result: nextResult,
      actionLookupId: nextResult === "fail" ? rows[testId].actionLookupId : "",
    });
  }

  async function persist(mode: "draft" | "submit") {
    setBusy(true);
    setMessage(null);

    const response = await fetch("/api/testing-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: existingEvent?.id,
        employeeId,
        manager1Id,
        manager2Id,
        locationId,
        subLocation,
        engineNumber,
        jobId,
        methodLookupId,
        observationTypeLookupId,
        dutyLookupId,
        eventDate,
        eventTime,
        conditions,
        notificationStatus,
        notificationMethodLookupId,
        generalComments,
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
    <section className="panel form-shell paper-form-shell paper-form-document">
      <div className="paper-document-band">
        <div className="paper-header paper-header-dense">
          <div>
            <div className="paper-kicker">49 CFR 217.9</div>
            <div className="paper-title">Operational Testing Record</div>
            <div className="paper-subtitle">One employee per event. Complete the fields to mirror the paper testing form.</div>
          </div>
          <div className="paper-header-stack">
            <div className="paper-control-box">
              <div className="paper-control-label">Status</div>
              <div className="paper-control-value">{existingEvent ? "Draft Revision" : "Draft Entry"}</div>
            </div>
            <div className="paper-control-box">
              <div className="paper-control-label">Control #</div>
              <div className="paper-control-value">{existingEvent?.id ? existingEvent.id.slice(0, 8).toUpperCase() : "Assigned On Save"}</div>
            </div>
          </div>
        </div>

        <div className="paper-section-title">Event Header</div>
        <div className="paper-grid paper-grid-tight paper-grid-form paper-ledger-grid">
          <label className="paper-field-cell">
            <span className="paper-field-caption">Date</span>
            <input className="field-input form-paper-input" onChange={(event) => setEventDate(event.target.value)} required type="date" value={eventDate} />
          </label>
          <label className="paper-field-cell">
            <span className="paper-field-caption">Time</span>
            <input className="field-input form-paper-input" onChange={(event) => setEventTime(event.target.value)} placeholder="1530" value={eventTime} />
          </label>
          <label className="paper-field-cell paper-span-full">
            <span className="paper-field-caption">Location</span>
            <select className="field-select form-paper-input" onChange={(event) => setLocationId(event.target.value)} required value={locationId}>
              <option value="">Select a location</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.label}
                </option>
              ))}
            </select>
          </label>
          <label className="paper-field-cell">
            <span className="paper-field-caption">Sub-location</span>
            <input className="field-input form-paper-input" onChange={(event) => setSubLocation(event.target.value)} value={subLocation} />
          </label>
          <label className="paper-field-cell">
            <span className="paper-field-caption">Engine #</span>
            <input className="field-input form-paper-input" onChange={(event) => setEngineNumber(event.target.value)} value={engineNumber} />
          </label>
          <label className="paper-field-cell">
            <span className="paper-field-caption">Job ID</span>
            <input className="field-input form-paper-input" onChange={(event) => setJobId(event.target.value)} value={jobId} />
          </label>
          <label className="paper-field-cell">
            <span className="paper-field-caption">Test Mgr 1</span>
            <select className="field-select form-paper-input" onChange={(event) => setManager1Id(event.target.value)} required value={manager1Id}>
              <option value="">Select manager</option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.label}
                </option>
              ))}
            </select>
          </label>
          <label className="paper-field-cell">
            <span className="paper-field-caption">Test Mgr 2</span>
            <select className="field-select form-paper-input" onChange={(event) => setManager2Id(event.target.value)} value={manager2Id}>
              <option value="">Optional</option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.label}
                </option>
              ))}
            </select>
          </label>
          <div className="paper-field-cell paper-span-full paper-box-field">
            <span className="paper-field-caption">Conditions</span>
            <div className="condition-grid">
              {CONDITION_OPTIONS.map((condition) => {
                const active = conditions.includes(condition);
                return (
                  <label className={`paper-check-option${active ? " paper-check-option-active" : ""}`} key={condition}>
                    <input checked={active} onChange={() => toggleCondition(condition)} type="checkbox" />
                    <span aria-hidden="true" className="paper-check-box" />
                    <span>{labelForCondition(condition)}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <label className="paper-field-cell">
            <span className="paper-field-caption">Method</span>
            <select className="field-select form-paper-input" onChange={(event) => setMethodLookupId(event.target.value)} required value={methodLookupId}>
              <option value="">Select method</option>
              {methods.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="paper-field-cell">
            <span className="paper-field-caption">Obs Type</span>
            <select className="field-select form-paper-input" onChange={(event) => setObservationTypeLookupId(event.target.value)} required value={observationTypeLookupId}>
              <option value="">Select type</option>
              {observationTypes.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="paper-section-title">Employee</div>
        <div className="paper-grid paper-grid-tight paper-grid-form paper-ledger-grid">
          <label className="paper-field-cell paper-span-full">
            <span className="paper-field-caption">Employee search</span>
            <input
              className="field-input form-paper-input"
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
              value={employeeQuery}
            />
          </label>
          {employeeQuery.trim() ? (
            <div className="paper-field-cell paper-span-full">
              <span className="paper-field-caption">Matching employees</span>
              <div className="search-results paper-match-grid">
                {filteredEmployees.length === 0 ? (
                  <div className="search-result-empty">No employee matches that search.</div>
                ) : (
                  filteredEmployees.map((employee) => {
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
                  })
                )}
              </div>
            </div>
          ) : null}
          <label className="paper-field-cell paper-span-full">
            <span className="paper-field-caption">Employee</span>
            <select className="field-select form-paper-input" onChange={(event) => selectEmployee(event.target.value)} required value={employeeId}>
              <option value="">Select employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.last_name}, {employee.first_name} ({employee.employee_number})
                  {employee.status !== "active" ? " - inactive" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="paper-field-cell">
            <span className="paper-field-caption">Emp ID</span>
            <input className="field-input form-paper-input" disabled value={selectedEmployee?.employee_number ?? ""} />
          </label>
          <label className="paper-field-cell">
            <span className="paper-field-caption">Emp Duties</span>
            <select className="field-select form-paper-input" onChange={(event) => setDutyLookupId(event.target.value)} required value={dutyLookupId}>
              <option value="">Select duty</option>
              {duties.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="paper-field-cell">
            <span className="paper-field-caption">Notified</span>
            <select className="field-select form-paper-input" onChange={(event) => setNotificationStatus(event.target.value as "pending" | "completed")} value={notificationStatus}>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <label className="paper-field-cell">
            <span className="paper-field-caption">Notification Method</span>
            <select className="field-select form-paper-input" onChange={(event) => setNotificationMethodLookupId(event.target.value)} value={notificationMethodLookupId}>
              <option value="">Optional</option>
              {notificationMethods.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="paper-section-title">Observed Tests</div>
        <div className="paper-table-shell">
          <table className="data-table form-table paper-table paper-tests-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Test #</th>
                <th>Applicable For</th>
                <th>Pass / Fail</th>
                <th>Action Taken</th>
                <th>Comments</th>
              </tr>
            </thead>
            <tbody>
              {enabledTests.map((test) => {
                const row = rows[test.id];
                const qualifiesLabel = test.qualifies_engineer_check_ride
                  ? "Engineer Annual / Check Ride"
                  : test.qualifies_engineer_annual
                    ? "Engineer Annual"
                    : test.qualifies_conductor_annual
                      ? "Conductor Annual"
                      : null;

                return (
                  <tr key={test.id}>
                    <td>
                      <div className="paper-task-name">{test.task_name}</div>
                      {qualifiesLabel ? <div className="qualifying-flag">{qualifiesLabel}</div> : null}
                    </td>
                    <td className="paper-numeric-cell">{test.test_number}</td>
                    <td>{test.applicability_label}</td>
                    <td>
                      <div className="paper-result-group">
                        <button
                          className={`paper-result-option${row.result === "pass" ? " paper-result-option-active" : ""}`}
                          onClick={() => setRowResult(test.id, row.result === "pass" ? "" : "pass")}
                          type="button"
                        >
                          <span aria-hidden="true" className="paper-mini-check" />
                          <span>Pass</span>
                        </button>
                        <button
                          className={`paper-result-option${row.result === "fail" ? " paper-result-option-active" : ""}`}
                          onClick={() => setRowResult(test.id, row.result === "fail" ? "" : "fail")}
                          type="button"
                        >
                          <span aria-hidden="true" className="paper-mini-check" />
                          <span>Fail</span>
                        </button>
                      </div>
                    </td>
                    <td>
                      <select
                        className="field-select form-paper-select"
                        disabled={row.result !== "fail"}
                        onChange={(event) => updateRow(test.id, { actionLookupId: event.target.value })}
                        value={row.actionLookupId}
                      >
                        <option value="">Select action</option>
                        {failureActions.map((action) => (
                          <option key={action.id} value={action.id}>
                            {action.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <textarea
                        className="field-textarea compact-textarea form-paper-textarea"
                        onChange={(event) => updateRow(test.id, { comments: event.target.value })}
                        value={row.comments}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="paper-section-title">Record Notes</div>
        <label className="paper-field-cell paper-notes-cell">
          <span className="paper-field-caption">Comments</span>
          <textarea className="field-textarea form-paper-textarea paper-notes-area" onChange={(event) => setGeneralComments(event.target.value)} value={generalComments} />
        </label>

        <div className="button-row paper-actions-row">
          <button className="button-secondary" disabled={busy} onClick={() => void persist("draft")} type="button">
            {busy ? "Saving..." : existingEvent ? "Save Draft Changes" : "Save Draft"}
          </button>
          <button className="button-primary" disabled={busy} onClick={() => void persist("submit")} type="button">
            {busy ? "Submitting..." : "Submit and Lock"}
          </button>
        </div>
        {message ? <div className="message message-error">{message}</div> : null}
      </div>
    </section>
  );
}
