import { SetupPanel } from "@/components/dashboard/setup-panel";
import { OpsDashboard } from "@/components/dashboard/ops-dashboard";
import { loadAppContext } from "@/lib/app-context";
import { getDashboardData, listTestingEvents } from "@/lib/operations-server";

export default async function DashboardPage() {
  const context = await loadAppContext();

  if (!context.schemaReady) {
    return (
      <section className="panel" style={{ padding: "1.5rem" }}>
        <div className="eyebrow">Setup Required</div>
        <h1 className="title-lg">Apply the operations testing migration before using this workspace</h1>
        <p className="text-muted" style={{ margin: "0.75rem 0 0", maxWidth: "54rem" }}>
          The application code is ready for the new operations testing module, but the Supabase schema still needs the SQL in <code>sql/003_operations_testing_phase1.sql</code>.
        </p>
      </section>
    );
  }

  if (context.needsBootstrap) {
    return <SetupPanel />;
  }

  if (!context.activeClient) {
    return (
      <section className="panel" style={{ padding: "1.5rem" }}>
        <div className="eyebrow">Access Pending</div>
        <h1 className="title-lg">No client workspace is assigned to this account yet</h1>
        <p className="text-muted" style={{ margin: "0.75rem 0 0", maxWidth: "48rem" }}>
          A master administrator needs to attach this user to a client before operations testing data can be viewed or entered.
        </p>
      </section>
    );
  }

  const [dashboard, events] = await Promise.all([
    getDashboardData(context.activeClient.clientId),
    listTestingEvents(context.activeClient.clientId),
  ]);

  const reviewCount = events.filter((event) =>
    ["review_hold_employee_status", "correction_requested", "submitted_notification_pending"].includes(String(event.status)),
  ).length;
  const amendedCount = events.filter((event) => String(event.status) === "amended_effective").length;

  return (
    <OpsDashboard
      clientName={context.activeClient.clientName}
      dashboard={dashboard}
      isAdmin={context.isMasterAdmin || context.activeClient.role === "client_administrator"}
      reviewCount={reviewCount}
      roleLabel={context.isMasterAdmin ? "master_administrator" : context.activeClient.role}
      amendedCount={amendedCount}
    />
  );
}
