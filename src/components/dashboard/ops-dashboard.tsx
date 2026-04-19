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
  isAdmin: boolean;
  roleLabel: "manager" | "client_administrator" | "master_administrator";
  reviewCount: number;
  amendedCount: number;
};

function EmployeeList({ employees, emptyLabel }: { employees: Array<Record<string, unknown>>; emptyLabel: string }) {
  if (employees.length === 0) {
    return <p className="text-muted" style={{ margin: "0.8rem 0 0" }}>{emptyLabel}</p>;
  }

  return (
    <div className="workflow-list" style={{ marginTop: "0.8rem" }}>
      {employees.slice(0, 6).map((employee) => (
        <div className="workflow-row" key={String(employee.id)}>
          <div>
            <div className="workflow-row-title">{String(employee.last_name)}, {String(employee.first_name)}</div>
            <div className="workflow-row-meta">Employee ID {String(employee.employee_number)}</div>
          </div>
          <span className="status-pill status-needs_review">Needs qualifying test</span>
        </div>
      ))}
    </div>
  );
}

function ActionCard({
  title,
  value,
  body,
  tone = "default",
}: {
  title: string;
  value: number;
  body: string;
  tone?: "default" | "warning" | "danger" | "success";
}) {
  return (
    <article className={`panel operations-stat-card operations-stat-${tone}`}>
      <div className="operations-stat-label">{title}</div>
      <div className="operations-stat-value">{value}</div>
      <div className="operations-stat-body">{body}</div>
    </article>
  );
}

export function OpsDashboard({ clientName, dashboard, isAdmin, roleLabel, reviewCount, amendedCount }: Props) {
  const annualNeedCount =
    dashboard.conductorNeeds.length + dashboard.engineerNeeds.length + dashboard.engineerCheckRideNeeds.length;
  const actionNowCount = dashboard.draftCount + dashboard.pendingNotificationCount + reviewCount;
  const auditExposureCount = annualNeedCount + dashboard.pendingNotificationCount + reviewCount;

  const modeTitle = isAdmin ? "Administrator compliance review" : "Manager execution";
  const modeBody = isAdmin
    ? "Queues, amendment tools, and audit readiness signals for compliance oversight."
    : "Task-oriented actions to complete field transfer, follow up on notification, and keep testing current.";

  return (
    <div className="operations-dashboard">
      <section className="panel operations-hero">
        <div className="operations-hero-copy">
          <div className="eyebrow">Operations Testing</div>
          <h1 className="title-lg">{clientName}</h1>
          <p className="operations-hero-text">
            The dashboard surfaces what needs action now, what is overdue, what is pending review, and what could
            affect audit readiness.
          </p>
        </div>

        <aside className="operations-mode-card">
          <div className="operations-mode-kicker">Active Mode</div>
          <div className="operations-mode-title">{modeTitle}</div>
          <div className="operations-mode-body">{modeBody}</div>
          <div className="operations-mode-tags">
            <span className="status-pill status-validated">{roleLabel.replace(/_/g, " ")}</span>
            {isAdmin ? <span className="status-pill status-needs_review">Audit oversight enabled</span> : <span className="status-pill status-received">Execution simplified</span>}
          </div>
        </aside>
      </section>

      <section className="operations-grid operations-grid-four">
        <ActionCard title="Needs action now" tone={actionNowCount > 0 ? "warning" : "success"} value={actionNowCount} body="Drafts, pending notification, and records that need review or amendment." />
        <ActionCard title="Overdue / uncovered" tone={annualNeedCount > 0 ? "danger" : "success"} value={annualNeedCount} body="Employees still lacking the annual qualifying tests or check rides visible in this dataset." />
        <ActionCard title="Pending review" tone={reviewCount > 0 ? "warning" : "success"} value={reviewCount} body="Records in hold, correction-request, or notification follow-up states." />
        <ActionCard title="Audit readiness" tone={auditExposureCount > 0 ? "danger" : "success"} value={auditExposureCount} body="Open items that would need explanation, completion, or correction before an audit review." />
      </section>

      <section className="operations-grid operations-grid-split">
        <article className="panel operations-card">
          <div className="operations-card-header">
            <div>
              <div className="eyebrow">Next Actions</div>
              <h2 className="operations-card-title">{isAdmin ? "Compliance queues and exception handling" : "Manager work queue"}</h2>
            </div>
            <div className="button-row">
              <Link className="button-primary" href="/testing/new">Submit New Testing</Link>
              <Link className="button-secondary" href="/testing">All Testing</Link>
              <Link className="button-secondary" href="/employees">Employees</Link>
              {isAdmin ? <Link className="button-secondary" href="/admin/intake">Review Queue</Link> : null}
            </div>
          </div>

          <div className="workflow-list">
            <div className="workflow-row">
              <div>
                <div className="workflow-row-title">Draft records awaiting transfer completion</div>
                <div className="workflow-row-meta">Complete the paper-to-system transfer before certification.</div>
              </div>
              <span className={`status-pill ${dashboard.draftCount > 0 ? "status-pending" : "status-validated"}`}>{dashboard.draftCount}</span>
            </div>
            <div className="workflow-row">
              <div>
                <div className="workflow-row-title">Submitted events pending notification</div>
                <div className="workflow-row-meta">Feedback to employees still needs to be completed or documented.</div>
              </div>
              <span className={`status-pill ${dashboard.pendingNotificationCount > 0 ? "status-needs_review" : "status-validated"}`}>{dashboard.pendingNotificationCount}</span>
            </div>
            <div className="workflow-row">
              <div>
                <div className="workflow-row-title">Records pending administrative review</div>
                <div className="workflow-row-meta">Held events, correction requests, or notification follow-up items.</div>
              </div>
              <span className={`status-pill ${reviewCount > 0 ? "status-needs_review" : "status-validated"}`}>{reviewCount}</span>
            </div>
            {isAdmin ? (
              <div className="workflow-row">
                <div>
                  <div className="workflow-row-title">Amended effective records on file</div>
                  <div className="workflow-row-meta">Current records with approved changes and preserved original history.</div>
                </div>
                <span className="status-pill status-received">{amendedCount}</span>
              </div>
            ) : null}
          </div>
        </article>

        <article className="panel operations-card">
          <div className="operations-card-header">
            <div>
              <div className="eyebrow">Readiness</div>
              <h2 className="operations-card-title">Audit-facing operational posture</h2>
            </div>
          </div>

          <div className="operations-readiness">
            <div className="readiness-band">
              <span className="readiness-label">Recorded testing events</span>
              <strong>{dashboard.eventCount}</strong>
            </div>
            <div className="readiness-band">
              <span className="readiness-label">Completed observations</span>
              <strong>{dashboard.rowCount}</strong>
            </div>
            <div className="readiness-band">
              <span className="readiness-label">Open annual qualifying needs</span>
              <strong>{annualNeedCount}</strong>
            </div>
            <div className="readiness-band">
              <span className="readiness-label">Current audit risk indicators</span>
              <strong>{auditExposureCount}</strong>
            </div>
          </div>
        </article>
      </section>

      <section className="operations-grid operations-grid-three">
        <article className="panel operations-card">
          <div className="eyebrow">Conductor Annual</div>
          <h2 className="operations-card-title">Employees needing a qualifying conductor test</h2>
          <EmployeeList employees={dashboard.conductorNeeds} emptyLabel="No conductor annual needs are visible in the current dataset." />
        </article>
        <article className="panel operations-card">
          <div className="eyebrow">Engineer Annual</div>
          <h2 className="operations-card-title">Employees needing a qualifying engineer test</h2>
          <EmployeeList employees={dashboard.engineerNeeds} emptyLabel="No engineer annual needs are visible in the current dataset." />
        </article>
        <article className="panel operations-card">
          <div className="eyebrow">Engineer Check Ride</div>
          <h2 className="operations-card-title">Employees needing an engineer check ride</h2>
          <EmployeeList employees={dashboard.engineerCheckRideNeeds} emptyLabel="No check-ride needs are visible in the current dataset." />
        </article>
      </section>
    </div>
  );
}
