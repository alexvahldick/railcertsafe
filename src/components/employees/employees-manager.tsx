"use client";

import { useMemo, useState } from "react";
import { CERTIFICATION_CLASS_DEFINITIONS } from "@/lib/operations";

type EmployeeRecord = {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  middle_initial: string | null;
  suffix: string | null;
  status: "active" | "inactive";
  notes: string | null;
  is_testing_manager: boolean;
  certifications: Array<{
    class_code: string;
    status: "active" | "inactive" | "expired";
    issue_date: string | null;
    expiration_date: string | null;
  }>;
};

type Props = {
  employees: EmployeeRecord[];
};

type CertificationDraft = {
  classCode: string;
  status: "active" | "inactive" | "expired";
  issueDate: string;
  expirationDate: string;
};

type EmployeeDraft = {
  employeeId?: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  middleInitial: string;
  suffix: string;
  status: "active" | "inactive";
  notes: string;
  isTestingManager: boolean;
  certifications: CertificationDraft[];
};

function emptyDraft(): EmployeeDraft {
  return {
    employeeNumber: "",
    firstName: "",
    lastName: "",
    middleInitial: "",
    suffix: "",
    status: "active",
    notes: "",
    isTestingManager: false,
    certifications: [],
  };
}

export function EmployeesManager({ employees }: Props) {
  const [draft, setDraft] = useState<EmployeeDraft>(emptyDraft());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const sortedEmployees = useMemo(
    () => [...employees].sort((left, right) => `${left.last_name}${left.first_name}`.localeCompare(`${right.last_name}${right.first_name}`)),
    [employees],
  );

  function loadEmployee(employee: EmployeeRecord) {
    setDraft({
      employeeId: employee.id,
      employeeNumber: employee.employee_number,
      firstName: employee.first_name,
      lastName: employee.last_name,
      middleInitial: employee.middle_initial ?? "",
      suffix: employee.suffix ?? "",
      status: employee.status,
      notes: employee.notes ?? "",
      isTestingManager: employee.is_testing_manager,
      certifications: employee.certifications.map((certification) => ({
        classCode: certification.class_code,
        status: certification.status,
        issueDate: certification.issue_date ?? "",
        expirationDate: certification.expiration_date ?? "",
      })),
    });
    setMessage(null);
  }

  function toggleCertification(classCode: string) {
    setDraft((current) => {
      const exists = current.certifications.some((certification) => certification.classCode === classCode);
      return {
        ...current,
        certifications: exists
          ? current.certifications.filter((certification) => certification.classCode !== classCode)
          : [...current.certifications, { classCode, status: "active", issueDate: "", expirationDate: "" }],
      };
    });
  }

  function updateCertification(classCode: string, patch: Partial<CertificationDraft>) {
    setDraft((current) => ({
      ...current,
      certifications: current.certifications.map((certification) =>
        certification.classCode === classCode ? { ...certification, ...patch } : certification,
      ),
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    const response = await fetch("/api/employees", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(draft),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setBusy(false);
      setMessage(payload?.error ?? "Could not save employee.");
      return;
    }

    window.location.reload();
  }

  return (
    <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "minmax(300px, 380px) minmax(0, 1fr)" }}>
      <section className="panel" style={{ padding: "1.2rem", display: "grid", gap: "0.8rem", alignSelf: "start" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
          <div>
            <div className="eyebrow">Employees</div>
            <h2 style={{ margin: "0.35rem 0 0", fontSize: "1.35rem" }}>Client roster</h2>
          </div>
          <button className="button-secondary" onClick={() => setDraft(emptyDraft())} type="button">
            New
          </button>
        </div>

        <div style={{ display: "grid", gap: "0.65rem" }}>
          {sortedEmployees.map((employee) => (
            <button
              className="panel-muted"
              key={employee.id}
              onClick={() => loadEmployee(employee)}
              style={{ padding: "0.9rem", textAlign: "left", border: "none" }}
              type="button"
            >
              <div style={{ fontWeight: 700 }}>{employee.last_name}, {employee.first_name}</div>
              <div className="text-muted" style={{ marginTop: "0.2rem" }}>
                ID {employee.employee_number} | {employee.status}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="panel" style={{ padding: "1.5rem", display: "grid", gap: "1rem" }}>
        <div>
          <div className="eyebrow">{draft.employeeId ? "Edit Employee" : "New Employee"}</div>
          <h1 className="title-lg">{draft.employeeId ? "Update employee and certification classes" : "Add employee"}</h1>
        </div>

        <form className="field-grid" onSubmit={handleSubmit}>
          <div className="form-two-col">
            <label className="field-label">
              Employee ID
              <input className="field-input" value={draft.employeeNumber} onChange={(event) => setDraft((current) => ({ ...current, employeeNumber: event.target.value }))} required />
            </label>
            <label className="field-label">
              Status
              <select className="field-select" value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as "active" | "inactive" }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
          </div>

          <div className="form-two-col">
            <label className="field-label">
              First name
              <input className="field-input" value={draft.firstName} onChange={(event) => setDraft((current) => ({ ...current, firstName: event.target.value }))} required />
            </label>
            <label className="field-label">
              Last name
              <input className="field-input" value={draft.lastName} onChange={(event) => setDraft((current) => ({ ...current, lastName: event.target.value }))} required />
            </label>
          </div>

          <div className="form-two-col">
            <label className="field-label">
              Middle initial
              <input className="field-input" value={draft.middleInitial} onChange={(event) => setDraft((current) => ({ ...current, middleInitial: event.target.value }))} />
            </label>
            <label className="field-label">
              Suffix
              <input className="field-input" value={draft.suffix} onChange={(event) => setDraft((current) => ({ ...current, suffix: event.target.value }))} />
            </label>
          </div>

          <label className="field-label">
            Notes
            <textarea className="field-textarea" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} />
          </label>

          <label className="checkbox-row">
            <input checked={draft.isTestingManager} onChange={(event) => setDraft((current) => ({ ...current, isTestingManager: event.target.checked }))} type="checkbox" />
            Approved testing manager
          </label>

          <section className="panel-muted" style={{ padding: "1rem" }}>
            <div className="eyebrow">Certification Classes</div>
            <div style={{ marginTop: "0.9rem", display: "grid", gap: "0.8rem" }}>
              {CERTIFICATION_CLASS_DEFINITIONS.map((definition) => {
                const certification = draft.certifications.find((item) => item.classCode === definition.code);
                const selected = Boolean(certification);

                return (
                  <div key={definition.code} style={{ display: "grid", gap: "0.6rem" }}>
                    <label className="checkbox-row">
                      <input checked={selected} onChange={() => toggleCertification(definition.code)} type="checkbox" />
                      {definition.name}
                    </label>

                    {selected ? (
                      <div className="form-three-col">
                        <label className="field-label">
                          Status
                          <select className="field-select" value={certification?.status ?? "active"} onChange={(event) => updateCertification(definition.code, { status: event.target.value as CertificationDraft["status"] })}>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="expired">Expired</option>
                          </select>
                        </label>
                        <label className="field-label">
                          Issue date
                          <input className="field-input" type="date" value={certification?.issueDate ?? ""} onChange={(event) => updateCertification(definition.code, { issueDate: event.target.value })} />
                        </label>
                        <label className="field-label">
                          Expiration date
                          <input className="field-input" type="date" value={certification?.expirationDate ?? ""} onChange={(event) => updateCertification(definition.code, { expirationDate: event.target.value })} />
                        </label>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>

          <button className="button-primary" disabled={busy} type="submit">
            {busy ? "Saving..." : draft.employeeId ? "Update employee" : "Create employee"}
          </button>
        </form>

        {message ? <div className="message message-error">{message}</div> : null}
      </section>
    </div>
  );
}
