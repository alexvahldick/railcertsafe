import { TestingEventsList } from "@/components/testing/testing-events-list";
import { loadAppContext } from "@/lib/app-context";
import { getClientEmployees, listTestingEvents } from "@/lib/operations-server";

export default async function TestingIndexPage() {
  const context = await loadAppContext();

  if (!context.schemaReady || !context.activeClient) {
    return null;
  }

  const [events, employees] = await Promise.all([
    listTestingEvents(context.activeClient.clientId),
    getClientEmployees(context.activeClient.clientId),
  ]);

  const employeeList = employees as unknown as Array<{ id: string; first_name: string; last_name: string; employee_number: string }>;
  const employeesById = Object.fromEntries(
    employeeList.map((employee) => [
      String(employee.id),
      `${String(employee.last_name)}, ${String(employee.first_name)} (${String(employee.employee_number)})`,
    ]),
  );

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <section className="panel" style={{ padding: "1.5rem" }}>
        <div className="eyebrow">All Testing</div>
        <h1 className="title-lg">Recorded testing events</h1>
        <p className="text-muted" style={{ margin: "0.75rem 0 0", maxWidth: "48rem" }}>
          This view shows all testing events for the active client, including drafts, submitted events, amended effective records, and items currently in review.
        </p>
      </section>

      <TestingEventsList
        events={events.map((event) => ({
          id: String(event.id),
          controlNumber: String(event.control_number),
          eventDate: String(event.event_date),
          status: String(event.status),
          notificationStatus: String(event.currentNotificationStatus ?? event.notification_status ?? ""),
          employeeLabel: employeesById[String(event.employee_id)] ?? String(event.employee_id),
          rowCount: (event.rows as { result: string | null }[]).filter((row) => Boolean(row.result)).length,
        }))}
      />
    </div>
  );
}
