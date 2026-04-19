import { TestingEventForm } from "@/components/testing/testing-event-form";
import { loadAppContext } from "@/lib/app-context";
import { getClientEmployees, getClientLocations, getClientTestManagers, getEnabledTests, getLookupValues } from "@/lib/operations-server";

export default async function NewTestingEventPage() {
  const context = await loadAppContext();

  if (!context.schemaReady || !context.activeClient) {
    return null;
  }

  const [employees, managers, locations, lookups, enabledTests] = await Promise.all([
    getClientEmployees(context.activeClient.clientId),
    getClientTestManagers(context.activeClient.clientId),
    getClientLocations(context.activeClient.clientId),
    getLookupValues(context.activeClient.clientId),
    getEnabledTests(context.activeClient.clientId),
  ]);
  const lookupList = lookups as Array<{ id: string; label: string; lookup_type: string }>;

  return (
    <div className="operations-page-stack">
      <section className="panel workflow-hero">
        <div>
          <div className="eyebrow">Manager Execution</div>
          <h1 className="title-lg">Transfer a paper testing event into the certified record</h1>
          <p className="workflow-hero-text">
            The workflow is intentionally sequenced: identify the event, confirm the employee and notification details, mark only the observed tests, then certify when the paper transfer is complete.
          </p>
        </div>
        <div className="workflow-sequence-card">
          <div className="workflow-sequence-title">Entry Sequence</div>
          <ol className="workflow-sequence-list">
            <li>Header and operating context</li>
            <li>Employee and notification details</li>
            <li>Observed tests and failure actions</li>
            <li>Record notes and final certification</li>
          </ol>
        </div>
      </section>

      <TestingEventForm
        duties={lookupList.filter((lookup) => lookup.lookup_type === "duty").map((lookup) => ({ id: lookup.id, label: lookup.label }))}
        employees={employees as unknown as { id: string; employee_number: string; first_name: string; last_name: string; status: string }[]}
        enabledTests={enabledTests as never}
        failureActions={lookupList.filter((lookup) => lookup.lookup_type === "failure_action").map((lookup) => ({ id: lookup.id, label: lookup.label }))}
        locations={(locations as { id: string; name: string }[]).map((location) => ({ id: location.id, label: location.name }))}
        managers={(managers as { id: string; display_name: string }[]).map((manager) => ({ id: manager.id, label: manager.display_name }))}
        methods={lookupList.filter((lookup) => lookup.lookup_type === "method").map((lookup) => ({ id: lookup.id, label: lookup.label }))}
        notificationMethods={lookupList.filter((lookup) => lookup.lookup_type === "notification_method").map((lookup) => ({ id: lookup.id, label: lookup.label }))}
        observationTypes={lookupList.filter((lookup) => lookup.lookup_type === "observation_type").map((lookup) => ({ id: lookup.id, label: lookup.label }))}
      />
    </div>
  );
}
