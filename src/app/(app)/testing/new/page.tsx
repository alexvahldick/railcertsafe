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
    <div style={{ display: "grid", gap: "1rem" }}>
      <section className="panel" style={{ padding: "1.5rem" }}>
        <div className="eyebrow">Submit New Testing</div>
        <h1 className="title-lg">Transfer the paper event into the certified electronic record</h1>
        <p className="text-muted" style={{ margin: "0.75rem 0 0", maxWidth: "54rem" }}>
          The browser form mirrors the one-page field form. Save drafts freely, then use submit only when the transfer from the paper source record is complete and ready to be locked.
        </p>
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
