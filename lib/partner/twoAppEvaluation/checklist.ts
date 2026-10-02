// FILE: lib/partner/twoAppEvaluation/checklist.ts
// App A / App B checklists derived from durable integration events only.

import type { IntegrationEventRow } from "@/lib/partner/integrationObservability/record";
import type { LaunchpadActivityRow } from "@/lib/partner/pilotEvidence/load";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import { isLiveEvent } from "@/lib/partner/pilotEvidence/dedupe";
import type { AppEvaluationChecklist, ChecklistItemStatus, EvaluationChecklistItem } from "./contract";

function firstAt(events: IntegrationEventRow[], types: string[]): string | null {
  for (const event of events) {
    if (!isLiveEvent(event)) continue;
    if (types.includes(event.event_type)) return event.created_at;
  }
  return null;
}

function item(
  id: string,
  label: string,
  status: ChecklistItemStatus,
  observedAt: string | null,
  source: string,
  failureReason: string | null = null,
): EvaluationChecklistItem {
  return { id, label, status, observed_at: observedAt, source, failure_reason: failureReason };
}

function configuredStatus(
  app: LaunchpadApplicationRow | null,
  activity: LaunchpadActivityRow[],
): ChecklistItemStatus {
  if (!app) return "unavailable";
  const configured = activity.some((a) =>
    a.event_type === "application_provisioned" || a.event_type === "partner_flow_request_configured",
  );
  return configured || app.policy_id ? "observed" : "pending";
}

export function buildAppAChecklist(input: {
  application: LaunchpadApplicationRow | null;
  displayName: string;
  events: IntegrationEventRow[];
  activity: LaunchpadActivityRow[];
}): AppEvaluationChecklist {
  const { application, displayName, events, activity } = input;
  const appId = application?.id ?? "unknown";

  const configuredAt = application?.created_at ?? null;
  const requestAt = firstAt(events, ["verification_request_created", "hosted_handoff_created"]);
  const holderDoneAt = firstAt(events, ["holder_flow_completed"]);
  const receiptAt = firstAt(events, ["receipt_issued"]);
  const verifyOkAt = firstAt(events, ["receipt_verification_succeeded"]);
  const verifyFailAt = firstAt(events, ["receipt_verification_failed"]);

  const verifyStatus: ChecklistItemStatus = verifyOkAt
    ? "observed"
    : verifyFailAt
      ? "failed"
      : receiptAt
        ? "pending"
        : "pending";

  return {
    application_id: appId,
    display_name: displayName,
    server_verification_passed: Boolean(verifyOkAt),
    result_verified_at: verifyOkAt,
    items: [
      item("configured", "Application configured", configuredStatus(application, activity), configuredAt, "partner_launchpad_applications"),
      item("policy_bound", "Compatible policy bound", application?.policy_id ? "observed" : "pending", configuredAt, "partner_launchpad_applications.policy_id"),
      item("callback", "Callback configured where required", application?.allowed_return_urls?.length ? "observed" : "pending", configuredAt, "partner_launchpad_applications.allowed_return_urls"),
      item("credential", "Sandbox credential available", application?.api_key_id ? "observed" : "pending", configuredAt, "partner_launchpad_applications.api_key_id"),
      item("request", "Verification initiated", requestAt ? "observed" : "pending", requestAt, "partner_integration_events:verification_request_created"),
      item("holder", "Holder flow completed", holderDoneAt ? "observed" : requestAt ? "pending" : "pending", holderDoneAt, "partner_integration_events:holder_flow_completed"),
      item("receipt", "Result issued", receiptAt ? "observed" : "pending", receiptAt, "partner_integration_events:receipt_issued"),
      item(
        "server_verify",
        "Server verification succeeded",
        verifyStatus,
        verifyOkAt ?? verifyFailAt,
        verifyOkAt ? "partner_integration_events:receipt_verification_succeeded" : "partner_integration_events",
        verifyFailAt ? "Server verification failed — re-fetch and verify the public receipt before granting access." : null,
      ),
    ],
  };
}

export function buildAppBChecklist(input: {
  application: LaunchpadApplicationRow | null;
  displayName: string;
  events: IntegrationEventRow[];
  activity: LaunchpadActivityRow[];
  appAReady: boolean;
}): AppEvaluationChecklist {
  const { application, displayName, events, activity, appAReady } = input;
  const appId = application?.id ?? "unknown";

  const requestAt = firstAt(events, ["verification_request_created", "hosted_handoff_created"]);
  const reuseAttemptAt = firstAt(events, [
    "evidence_reuse_accepted",
    "evidence_reuse_rejected",
    "evidence_refresh_required",
  ]);
  const reuseAcceptedAt = firstAt(events, ["evidence_reuse_accepted"]);
  const reuseRejected = events.find((e) => isLiveEvent(e) && e.event_type === "evidence_reuse_rejected");
  const refreshRequired = events.find((e) => isLiveEvent(e) && e.event_type === "evidence_refresh_required");
  const receiptAt = firstAt(events, ["receipt_issued"]);
  const verifyOkAt = firstAt(events, ["receipt_verification_succeeded"]);
  const verifyFailAt = firstAt(events, ["receipt_verification_failed"]);

  let reuseStatus: ChecklistItemStatus = "pending";
  if (reuseAcceptedAt) reuseStatus = "observed";
  else if (reuseRejected) reuseStatus = "failed";
  else if (refreshRequired) reuseStatus = "failed";

  const reuseFailure = reuseRejected
    ? (reuseRejected.partner_safe_reason ?? reuseRejected.outcome ?? "Reuse not compatible with current policy or evidence state.")
    : refreshRequired
      ? "Compatible evidence exists but freshness or consent requires refresh before reuse."
      : null;

  const verifyStatus: ChecklistItemStatus = verifyOkAt
    ? "observed"
    : verifyFailAt
      ? "failed"
      : "pending";

  const basePending = !appAReady;

  return {
    application_id: appId,
    display_name: displayName,
    server_verification_passed: Boolean(verifyOkAt),
    result_verified_at: verifyOkAt,
    items: [
      item("configured", "Application configured", basePending ? "pending" : configuredStatus(application, activity), application?.created_at ?? null, "partner_launchpad_applications"),
      item("policy", "Compatible policy bound", basePending ? "pending" : application?.policy_id ? "observed" : "pending", application?.created_at ?? null, "partner_launchpad_applications.policy_id"),
      item("request", "Verification request created", basePending ? "pending" : requestAt ? "observed" : "pending", requestAt, "partner_integration_events:verification_request_created"),
      item("reuse_eval", "Reuse evaluated", basePending ? "pending" : reuseAttemptAt ? "observed" : requestAt ? "pending" : "pending", reuseAttemptAt, "partner_integration_events:evidence_reuse_*"),
      item("reuse_accept", "Reuse accepted", basePending ? "pending" : reuseStatus, reuseAcceptedAt ?? reuseRejected?.created_at ?? refreshRequired?.created_at ?? null, "partner_integration_events:evidence_reuse_accepted", reuseFailure),
      item("receipt", "Result issued", basePending ? "pending" : receiptAt ? "observed" : "pending", receiptAt, "partner_integration_events:receipt_issued"),
      item(
        "server_verify",
        "Server verification succeeded",
        basePending ? "pending" : verifyStatus,
        verifyOkAt ?? verifyFailAt,
        "partner_integration_events:receipt_verification_succeeded",
        verifyFailAt ? "Server verification failed for App B result." : null,
      ),
    ],
  };
}
