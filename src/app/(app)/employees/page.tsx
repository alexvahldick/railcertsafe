import { loadAppContext } from "@/lib/app-context";
import { getClientEmployees } from "@/lib/operations-server";
import { EmployeesManager } from "@/components/employees/employees-manager";

export default async function EmployeesPage() {
  const context = await loadAppContext();

  if (!context.schemaReady || !context.activeClient) {
    return null;
  }

  const employees = await getClientEmployees(context.activeClient.clientId);

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <section className="panel" style={{ padding: "1.5rem" }}>
        <div className="eyebrow">Employee Maintenance</div>
        <h1 className="title-lg">Roster, active status, and certification classes</h1>
        <p className="text-muted" style={{ margin: "0.75rem 0 0", maxWidth: "54rem" }}>
          Maintain the client employee roster and the minimum certification-class fields needed to drive annual qualifying-test visibility in the operations testing dashboard.
        </p>
      </section>

      <EmployeesManager employees={employees as never} />
    </div>
  );
}
