import Link from "next/link";

type Props = {
  clientName: string;
  dashboard: {
    draftCount: number;
    pendingNotificationCount: number;
    eventCount: number;
    rowCount: number;
    conductorNeeds: Array<Record<string, unknown>>;
    engineerNeeds: Array<Record<string, unknown>>;
    engineerCheckRideNeeds: Array<Record<string, unknown>>;
  };
};

function EmployeeList({ employees, emptyLabel }: { employees: Array<Record<string, unknown>>; emptyLabel: string }) {
  if (employees.length === 0) {
    return <p className="text-muted" style={{ margin: "0.85rem 0 0" }}>{emptyLabel}</p>;
  }

  return (
    <div style={{ marginTop: "0.9rem", display: "grid", gap: "0.6rem" }}>
      {employees.slice(0, 8).map((employee) => (
        <div className="panel-muted" key={String(employee.id)} style={{ padding: "0.8rem 0.9rem" }}>
          <div style={{ fontWeight: 700 }}>{String(employee.last_name)}, {String(employee.first_name)}</div>
          <div className="text-muted" style={{ marginTop: "0.2rem" }}>ID {String(employee.employee_number)}</div>
        </div>
      ))}
    </div>
  );
}

export function OpsDashboard({ clientName, dashboard }: Props) {
  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <section className="panel" style={{ padding: "1.5rem", display: "grid", gap: "1rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", justifyContent: "space-between", alignItems: "start" }}>
          <div>
            <div className="eyebrow">Operations Testing</div>
            <h1 className="title-lg">{clientName}</h1>
            <p className="text-muted" style={{ margin: "0.75rem 0 0", maxWidth: "48rem" }}>
              Paper-first operational testing with controlled browser entry, immutable certified records, and annual qualifying-test visibility by certification class.
            </p>
          </div>

          <div className="button-row">
            <Link className="button-secondary" href="/testing">View All Testing</Link>
            <Link className="button-primary" href="/testing/new">Submit New Testing</Link>
            <Link className="button-secondary" href="/employees">Manage Employees</Link>
          </div>
        </div>
      </section>

      <section style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <article className="panel" style={{ padding: "1.25rem" }}>
          <div className="eyebrow">Drafts</div>
          <div className="metric-number">{dashboard.draftCount}</div>
          <div className="text-muted">Unsubmitted testing forms</div>
        </article>
        <article className="panel" style={{ padding: "1.25rem" }}>
          <div className="eyebrow">Notifications</div>
          <div className="metric-number">{dashboard.pendingNotificationCount}</div>
          <div className="text-muted">Submitted events still pending notification</div>
        </article>
        <article className="panel" style={{ padding: "1.25rem" }}>
          <div className="eyebrow">Events</div>
          <div className="metric-number">{dashboard.eventCount}</div>
          <div className="text-muted">Recorded testing events</div>
        </article>
        <article className="panel" style={{ padding: "1.25rem" }}>
          <div className="eyebrow">Test Rows</div>
          <div className="metric-number">{dashboard.rowCount}</div>
          <div className="text-muted">Completed observations recorded</div>
        </article>
      </section>

      <section style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        <article className="panel" style={{ padding: "1.25rem" }}>
          <div className="eyebrow">Conductor Annual</div>
          <h2 style={{ margin: "0.35rem 0 0", fontSize: "1.35rem" }}>Employees still needing a qualifying conductor test</h2>
          <EmployeeList employees={dashboard.conductorNeeds} emptyLabel="No open conductor annual needs in the current dataset." />
        </article>
        <article className="panel" style={{ padding: "1.25rem" }}>
          <div className="eyebrow">Engineer Annual</div>
          <h2 style={{ margin: "0.35rem 0 0", fontSize: "1.35rem" }}>Employees still needing a qualifying engineer test</h2>
          <EmployeeList employees={dashboard.engineerNeeds} emptyLabel="No open engineer annual needs in the current dataset." />
        </article>
        <article className="panel" style={{ padding: "1.25rem" }}>
          <div className="eyebrow">Engineer Check Ride</div>
          <h2 style={{ margin: "0.35rem 0 0", fontSize: "1.35rem" }}>Employees still needing an engineer check ride</h2>
          <EmployeeList employees={dashboard.engineerCheckRideNeeds} emptyLabel="No open check-ride needs in the current dataset." />
        </article>
      </section>
    </div>
  );
}
