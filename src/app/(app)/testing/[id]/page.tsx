import { TestingEventDetail } from "@/components/testing/testing-event-detail";
import { TestingEventForm } from "@/components/testing/testing-event-form";
import { loadAppContext } from "@/lib/app-context";
import { getTestingEventDetail } from "@/lib/operations-server";

export default async function TestingEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await loadAppContext();

  if (!context.schemaReady || !context.activeClient) {
    return null;
  }

  const detail = await getTestingEventDetail(context.activeClient.clientId, id);
  const canApplyAmendments = context.isMasterAdmin || context.activeClient.role === "client_administrator";
  const lookupList = detail.lookups as Array<{ id: string; label: string; lookup_type: string }>;

  if (!detail.event) {
    return (
      <section className="panel" style={{ padding: "1.5rem" }}>
        <div className="eyebrow">Not Found</div>
        <h1 className="title-lg">Testing event not found</h1>
      </section>
    );
  }

  if (String(detail.event.status) === "draft") {
    const enabledTests = Object.values(detail.event.enabledTestsById ?? {}) as Array<{
      id: string;
      test_number: number;
      task_name: string;
      applicability_label: string;
      qualifies_conductor_annual: boolean;
      qualifies_engineer_annual: boolean;
      qualifies_engineer_check_ride: boolean;
    }>;

    return (
      <TestingEventForm
        duties={lookupList.filter((lookup) => lookup.lookup_type === "duty").map((lookup) => ({ id: lookup.id, label: lookup.label }))}
        employees={detail.employees as unknown as { id: string; employee_number: string; first_name: string; last_name: string; status: string }[]}
        enabledTests={enabledTests}
        existingEvent={detail.event as never}
        failureActions={lookupList.filter((lookup) => lookup.lookup_type === "failure_action").map((lookup) => ({ id: lookup.id, label: lookup.label }))}
        locations={(detail.locations as { id: string; name: string }[]).map((location) => ({ id: location.id, label: location.name }))}
        managers={(detail.managers as { id: string; display_name: string }[]).map((manager) => ({ id: manager.id, label: manager.display_name }))}
        methods={lookupList.filter((lookup) => lookup.lookup_type === "method").map((lookup) => ({ id: lookup.id, label: lookup.label }))}
        notificationMethods={lookupList.filter((lookup) => lookup.lookup_type === "notification_method").map((lookup) => ({ id: lookup.id, label: lookup.label }))}
        observationTypes={lookupList.filter((lookup) => lookup.lookup_type === "observation_type").map((lookup) => ({ id: lookup.id, label: lookup.label }))}
      />
    );
  }

  return (
    <TestingEventDetail
      amendments={detail.amendments as never}
      canApplyAmendments={canApplyAmendments}
      corrections={detail.corrections as never}
      dispositions={detail.dispositions as never}
      employees={detail.employees as never}
      event={detail.event as never}
      locations={detail.locations as never}
      lookups={detail.lookups as never}
      managers={detail.managers as never}
    />
  );
}
