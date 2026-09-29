// FILE: lib/partner/pilotEvidence/funnel.ts
// Canonical partner funnel from real events only.

import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import type { IntegrationEventRow } from "@/lib/partner/integrationObservability/record";
import type { LaunchpadActivityRow } from "./load";
import type { PartnerFunnelStage, PartnerFunnelStageId } from "./contract";
import { isLiveEvent, requestKey } from "./dedupe";

function firstEventAt(
  events: IntegrationEventRow[],
  types: string[],
  options?: { environment?: "sandbox" | "production"; liveOnly?: boolean },
): { at: string | null; source: string } {
  for (const event of events) {
    if (!types.includes(event.event_type)) continue;
    if (options?.environment && event.environment !== options.environment) continue;
    if (options?.liveOnly !== false && !isLiveEvent(event)) continue;
    return { at: event.created_at, source: `partner_integration_events:${event.event_type}` };
  }
  return { at: null, source: "partner_integration_events" };
}

function firstActivityAt(
  activity: LaunchpadActivityRow[],
  eventTypes: string[],
): { at: string | null; source: string } {
  for (const row of activity) {
    if (eventTypes.includes(row.event_type)) {
      return { at: row.created_at, source: `partner_launchpad_activity:${row.event_type}` };
    }
  }
  return { at: null, source: "partner_launchpad_activity" };
}

function repeatRequestAt(events: IntegrationEventRow[]): { at: string | null; source: string } {
  const completed = new Set<string>();
  for (const event of events) {
    if (event.event_type !== "holder_flow_completed" || !isLiveEvent(event)) continue;
    const key = requestKey(event);
    if (!key) continue;
    if (completed.has(key)) continue;
    completed.add(key);
    if (completed.size >= 2) {
      return { at: event.created_at, source: "partner_integration_events:holder_flow_completed(repeat)" };
    }
  }
  return { at: null, source: "partner_integration_events" };
}

export function buildPartnerFunnel(input: {
  application: LaunchpadApplicationRow;
  events: IntegrationEventRow[];
  activity: LaunchpadActivityRow[];
  environment: "sandbox" | "production";
}): PartnerFunnelStage[] {
  const { application, events, activity, environment } = input;

  const configured = firstActivityAt(activity, ["partner_flow_request_configured", "application_provisioned"]);
  const configuredAt = configured.at ?? application.created_at;
  const configuredSource = configured.at
    ? configured.source
    : "partner_launchpad_applications.created_at";

  const stageDefs: Array<{
    stage: PartnerFunnelStageId;
    label: string;
    resolve: () => { at: string | null; source: string; unavailable?: boolean };
  }> = [
    {
      stage: "integration_configured",
      label: "Integration configured",
      resolve: () => ({ at: configuredAt, source: configuredSource }),
    },
    {
      stage: "first_sandbox_request",
      label: "First sandbox request",
      resolve: () => firstEventAt(events, ["verification_request_created", "hosted_handoff_created"], { environment: "sandbox" }),
    },
    {
      stage: "first_sandbox_receipt",
      label: "First successful sandbox receipt",
      resolve: () => firstEventAt(events, ["receipt_issued"], { environment: "sandbox" }),
    },
    {
      stage: "production_requested",
      label: "Production access requested",
      resolve: () => firstActivityAt(activity, ["production_access_requested"]),
    },
    {
      stage: "production_activated",
      label: "Production activated",
      resolve: () => {
        const integration = firstEventAt(events, ["production_activation_completed"]);
        if (integration.at) return integration;
        if (application.production_activated_at) {
          return { at: application.production_activated_at, source: "partner_launchpad_applications.production_activated_at" };
        }
        return firstActivityAt(activity, ["production_application_activated", "production_access_approved"]);
      },
    },
    {
      stage: "first_production_request",
      label: "First production request",
      resolve: () => firstEventAt(events, ["verification_request_created", "hosted_handoff_created"], { environment: "production" }),
    },
    {
      stage: "holder_flow_started",
      label: "Holder flow started",
      resolve: () => firstEventAt(events, ["holder_flow_started"], { environment }),
    },
    {
      stage: "holder_flow_completed",
      label: "Holder flow completed",
      resolve: () => firstEventAt(events, ["holder_flow_completed"], { environment }),
    },
    {
      stage: "receipt_issued",
      label: "Receipt issued",
      resolve: () => firstEventAt(events, ["receipt_issued"], { environment }),
    },
    {
      stage: "partner_verification_succeeded",
      label: "Partner verification succeeded",
      resolve: () => firstEventAt(events, ["receipt_verification_succeeded"], { environment }),
    },
    {
      stage: "access_decision_recorded",
      label: "Access decision recorded",
      resolve: () => firstEventAt(events, ["access_decision_permit", "access_decision_deny"], { environment }),
    },
    {
      stage: "repeat_request",
      label: "Repeat request",
      resolve: () => repeatRequestAt(events.filter((event) => event.environment === environment)),
    },
    {
      stage: "evidence_reused",
      label: "Evidence reused",
      resolve: () => firstEventAt(events, ["evidence_reuse_accepted"], { environment }),
    },
  ];

  return stageDefs.map(({ stage, label, resolve }) => {
    const hit = resolve();
    return {
      stage,
      label,
      status: hit.unavailable ? "unavailable" as const : hit.at ? "observed" as const : "pending" as const,
      first_at: hit.at,
      source: hit.source,
    };
  });
}
