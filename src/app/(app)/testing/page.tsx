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
    <div className="operations-page-stack">
      <section className="panel workflow-hero">
        <div>
          <div className="eyebrow">Testing Records</div>
          <h1 className="title-lg">Recorded testing events</h1>
          <p className="workflow-hero-text">
            Use this view for event history, certification support, pending notification follow-up, and amendment-aware review of current effective records.
          </p>
        </div>
        <div className="workflow-sequence-card">
          <div className="workflow-sequence-title">Use This View To</div>
          <ol className="workflow-sequence-list">
            <li>Find a control number quickly</li>
            <li>Review record status and notification state</li>
            <li>Open amendment history and audit context</li>
            <li>Move to review actions when exceptions exist</li>
          </ol>
        </div>
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
