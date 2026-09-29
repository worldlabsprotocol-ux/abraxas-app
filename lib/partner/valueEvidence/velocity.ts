// FILE: lib/partner/valueEvidence/velocity.ts
// Integration velocity — first-class business proof from durable timestamps.

import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import type { LaunchpadActivityRow } from "@/lib/partner/pilotEvidence/load";
import type { IntegrationEventRow } from "@/lib/partner/integrationObservability/record";
import type { DurationMetric } from "./contract";
import { isLiveEvent } from "@/lib/partner/pilotEvidence/dedupe";

function duration(start: number | null, end: number | null, startEvent: string, endEvent: string): DurationMetric {
  if (start == null || end == null || end < start) {
    return { duration_ms: null, quality: "unavailable", start_event: startEvent, end_event: endEvent };
  }
  return { duration_ms: end - start, quality: "measured", start_event: startEvent, end_event: endEvent };
}

function firstEventMs(events: IntegrationEventRow[], types: string[], env?: "sandbox" | "production"): number | null {
  for (const event of events.filter(isLiveEvent)) {
    if (!types.includes(event.event_type)) continue;
    if (env && event.environment !== env) continue;
    return new Date(event.created_at).getTime();
  }
  return null;
}

function firstActivityMs(activity: LaunchpadActivityRow[], types: string[]): number | null {
  for (const row of activity) {
    if (types.includes(row.event_type)) return new Date(row.created_at).getTime();
  }
  return null;
}

export function computeIntegrationVelocity(input: {
  application: LaunchpadApplicationRow;
  events: IntegrationEventRow[];
  activity: LaunchpadActivityRow[];
}): Record<string, DurationMetric> {
  const created = new Date(input.application.created_at).getTime();
  const configured = firstActivityMs(input.activity, ["partner_flow_request_configured", "application_provisioned"]);
  const sandboxRequest = firstEventMs(input.events, ["verification_request_created", "hosted_handoff_created"], "sandbox");
  const sandboxReceipt = firstEventMs(input.events, ["receipt_issued"], "sandbox");
  const sandboxVerify = firstEventMs(input.events, ["receipt_verification_succeeded"], "sandbox");
  const prodRequest = firstActivityMs(input.activity, ["production_access_requested"]);
  const prodApproved = firstActivityMs(input.activity, ["production_access_approved", "production_review_approved"]);
  const prodActivated = input.application.production_activated_at
    ? new Date(input.application.production_activated_at).getTime()
    : firstEventMs(input.events, ["production_activation_completed"]);
  const prodVerify = firstEventMs(input.events, ["receipt_verification_succeeded"], "production");

  return {
    application_created_to_sandbox_configured: duration(created, configured, "application.created_at", "partner_flow_request_configured"),
    application_created_to_first_sandbox_request: duration(created, sandboxRequest, "application.created_at", "verification_request_created"),
    application_created_to_first_sandbox_receipt: duration(created, sandboxReceipt, "application.created_at", "receipt_issued"),
    application_created_to_first_successful_verification: duration(created, sandboxVerify, "application.created_at", "receipt_verification_succeeded"),
    production_requested_to_production_approved: duration(prodRequest, prodApproved, "production_access_requested", "production_access_approved"),
    production_activated_to_first_production_verification: duration(prodActivated, prodVerify, "production_activated_at", "receipt_verification_succeeded"),
  };
}
