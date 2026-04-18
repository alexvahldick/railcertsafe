import Link from "next/link";
import { loadAppContext } from "@/lib/app-context";
import { getClientEmployees, listTestingEvents } from "@/lib/operations-server";

export default async function AdminIntakePage() {
  const context = await loadAppContext();

  if (!context.schemaReady || !context.activeClient) {
    return null;
  }

  const [events, employees] = await Promise.all([
    listTestingEvents(context.activeClient.clientId),
    getClientEmployees(context.activeClient.clientId),
  ]);
  const employeeList = employees as unknown as Array<{ id: string; first_name: string; last_name: string; employee_number: string }>;
  const reviewEvents = events.filter((event) => ["review_hold_employee_status", "correction_requested", "submitted_notification_pending"].includes(String(event.status)));
  const employeesById = Object.fromEntries(
    employeeList.map((employee) => [
      String(employee.id),
      `${String(employee.last_name)}, ${String(employee.first_name)} (${String(employee.employee_number)})`,
    ]),
  );

  function queueActionLabel(event: Record<string, unknown>) {
    const status = String(event.status);
    if (status === "review_hold_employee_status") return "Review employee status";
    if (status === "submitted_notification_pending") return "Complete notification";
    if (status === "correction_requested") return "Apply amendment";
    return "Review";
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <section className="panel" style={{ padding: "1.5rem" }}>
        <div className="eyebrow">Review Queue</div>
        <h1 className="title-lg">Held events, notification follow-up, and correction requests</h1>
      </section>

      <section className="panel" style={{ padding: "0.5rem 0.5rem 1rem" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Control #</th>
                <th>Date</th>
                <th>Status</th>
                <th>Employee</th>
                <th>Needs Action</th>
                <th>Rows</th>
              </tr>
            </thead>
            <tbody>
              {reviewEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-muted">No review items are currently queued.</td>
                </tr>
              ) : reviewEvents.map((event) => (
                <tr key={String(event.id)}>
                  <td><Link href={`/testing/${String(event.id)}`}>{String(event.control_number)}</Link></td>
                  <td>{String(event.event_date)}</td>
                  <td>{String(event.status).replace(/_/g, " ")}</td>
                  <td>{employeesById[String(event.employee_id)] ?? String(event.employee_id)}</td>
                  <td>{queueActionLabel(event)}</td>
                  <td>{(event.rows as { result: string | null }[]).filter((row) => Boolean(row.result)).length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
