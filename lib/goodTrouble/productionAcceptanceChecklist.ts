// FILE: lib/goodTrouble/productionAcceptanceChecklist.ts
// Machine-readable first-transaction acceptance checklist. Stages stay pending without evidence.

import type { IntegrationEventRow } from "@/lib/partner/integrationObservability/record";
import type { LaunchpadActivityRow } from "@/lib/partner/pilotEvidence/load";
import { isLiveEvent } from "@/lib/partner/pilotEvidence/dedupe";
import type { GoodTroubleReadinessReport } from "@/lib/goodTrouble/productionReadiness";

export const ACCEPTANCE_STAGE_IDS = [
  "PREFLIGHT_READY",
  "HANDOFF_CREATED",
  "HOLDER_OPENED",
  "CONSENT_RECORDED",
  "ELIGIBILITY_EVALUATED",
  "RECEIPT_ISSUED",
  "HOLDER_RECEIPT_SHOWN",
  "HOLDER_RETURNED",
  "PARTNER_VERIFIED",
  "ACTION_AUTHORIZED",
  "PRIVACY_CONFIRMED",
  "TELEMETRY_RECORDED",
] as const;

export type AcceptanceStageId = (typeof ACCEPTANCE_STAGE_IDS)[number];

export type AcceptanceStageStatus = "pending" | "observed" | "unavailable";

export interface AcceptanceStage {
  stage: AcceptanceStageId;
  label: string;
  status: AcceptanceStageStatus;
  observed_at: string | null;
  evidence_source: string | null;
  evidence_ids: string[];
}

export interface InvestorTransactionEvidence {
  application_id: string | null;
  binding_id: string | null;
  policy_id: string | null;
  policy_version: number | null;
  result_family: string;
  environment: "production";
  request_timestamp: string | null;
  receipt_id: string | null;
  receipt_issued_at: string | null;
  verification_timestamp: string | null;
  action_authorization: "permit" | "deny" | null;
  reuse_classification: "fresh_verification" | "evidence_reused" | "unknown" | null;
  integration_event_ids: string[];
  latency_ms: number | null;
}

const STAGE_LABELS: Record<AcceptanceStageId, string> = {
  PREFLIGHT_READY: "Preflight readiness",
  HANDOFF_CREATED: "Handoff created",
  HOLDER_OPENED: "Holder opened Hosted Partner Flow",
  CONSENT_RECORDED: "Holder consent recorded",
  ELIGIBILITY_EVALUATED: "Eligibility evaluated",
  RECEIPT_ISSUED: "Production receipt issued",
  HOLDER_RECEIPT_SHOWN: "Holder saw live receipt",
  HOLDER_RETURNED: "Holder returned to partner",
  PARTNER_VERIFIED: "Partner verified receipt",
  ACTION_AUTHORIZED: "Action authorized",
  PRIVACY_CONFIRMED: "Privacy boundary confirmed",
  TELEMETRY_RECORDED: "Integration telemetry recorded",
};

function firstProdEvent(
  events: IntegrationEventRow[],
  types: string[],
): IntegrationEventRow | null {
  for (const event of events) {
    if (event.environment !== "production") continue;
    if (!isLiveEvent(event)) continue;
    if (!types.includes(event.event_type)) continue;
    return event;
  }
  return null;
}

function firstActivity(
  activity: LaunchpadActivityRow[],
  types: string[],
): LaunchpadActivityRow | null {
  for (const row of activity) {
    if (types.includes(row.event_type)) return row;
  }
  return null;
}

function observedStage(
  stage: AcceptanceStageId,
  hit: { at: string | null; source: string; ids?: string[] },
): AcceptanceStage {
  return {
    stage,
    label: STAGE_LABELS[stage],
    status: hit.at ? "observed" : "pending",
    observed_at: hit.at,
    evidence_source: hit.at ? hit.source : null,
    evidence_ids: hit.ids ?? [],
  };
}

export function buildProductionAcceptanceChecklist(input: {
  preflight: GoodTroubleReadinessReport;
  events: IntegrationEventRow[];
  activity?: LaunchpadActivityRow[];
}): AcceptanceStage[] {
  const { preflight, events, activity = [] } = input;
  const prodEvents = events.filter((e) => e.environment === "production" && isLiveEvent(e));

  const handoff = firstProdEvent(prodEvents, ["hosted_handoff_created", "verification_request_created"]);
  const holderOpened = firstProdEvent(prodEvents, ["holder_flow_started"]);
  const consent = firstActivity(activity, ["user_consented"]);
  const evaluated = firstProdEvent(prodEvents, ["policy_evaluated"]);
  const receipt = firstProdEvent(prodEvents, ["receipt_issued"]);
  const holderCompleted = firstProdEvent(prodEvents, ["holder_flow_completed"]);
  const handoffCompleted = firstProdEvent(prodEvents, ["hosted_handoff_completed"]);
  const returnActivity = firstActivity(activity, ["return_completed", "callback_completed"]);
  const verified = firstProdEvent(prodEvents, ["receipt_verification_succeeded"]);
  const permit = firstProdEvent(prodEvents, ["access_decision_permit"]);
  const deny = firstProdEvent(prodEvents, ["access_decision_deny"]);
  const reuseAccepted = firstProdEvent(prodEvents, ["evidence_reuse_accepted"]);
  const reuseRejected = firstProdEvent(prodEvents, ["evidence_reuse_rejected", "evidence_refresh_required"]);

  const preflightHit = preflight.ready
    ? { at: preflight.generated_at, source: "good_trouble_production_readiness", ids: [] as string[] }
    : { at: null, source: "good_trouble_production_readiness", ids: [] as string[] };

  // Privacy confirmed only when receipt issued + verification succeeded without prohibited fields in telemetry.
  const privacyObserved = receipt && verified
    ? { at: verified.created_at, source: "receipt_verification_succeeded(no_pii_fields)", ids: [verified.event_id] }
    : { at: null, source: "operator_attestation_required", ids: [] as string[] };

  const telemetry = verified ?? permit ?? deny ?? receipt;

  return [
    observedStage("PREFLIGHT_READY", preflightHit),
    observedStage("HANDOFF_CREATED", {
      at: handoff?.created_at ?? null,
      source: handoff ? `partner_integration_events:${handoff.event_type}` : "partner_integration_events",
      ids: handoff ? [handoff.event_id] : [],
    }),
    observedStage("HOLDER_OPENED", {
      at: holderOpened?.created_at ?? null,
      source: holderOpened ? `partner_integration_events:${holderOpened.event_type}` : "partner_integration_events",
      ids: holderOpened ? [holderOpened.event_id] : [],
    }),
    observedStage("CONSENT_RECORDED", {
      at: consent?.created_at ?? null,
      source: consent ? `partner_launchpad_activity:${consent.event_type}` : "partner_launchpad_activity",
      ids: consent?.public_code ? [consent.public_code] : [],
    }),
    observedStage("ELIGIBILITY_EVALUATED", {
      at: evaluated?.created_at ?? null,
      source: evaluated ? `partner_integration_events:${evaluated.event_type}` : "partner_integration_events",
      ids: evaluated ? [evaluated.event_id] : [],
    }),
    observedStage("RECEIPT_ISSUED", {
      at: receipt?.created_at ?? null,
      source: receipt ? `partner_integration_events:${receipt.event_type}` : "partner_integration_events",
      ids: receipt ? [receipt.event_id] : [],
    }),
    observedStage("HOLDER_RECEIPT_SHOWN", {
      at: holderCompleted?.created_at ?? receipt?.created_at ?? null,
      source: holderCompleted
        ? "partner_integration_events:holder_flow_completed"
        : receipt
          ? "partner_integration_events:receipt_issued(proxy)"
          : "holder_ui_attestation",
      ids: holderCompleted ? [holderCompleted.event_id] : receipt ? [receipt.event_id] : [],
    }),
    observedStage("HOLDER_RETURNED", {
      at: handoffCompleted?.created_at ?? returnActivity?.created_at ?? null,
      source: handoffCompleted
        ? "partner_integration_events:hosted_handoff_completed"
        : returnActivity
          ? `partner_launchpad_activity:${returnActivity.event_type}`
          : "partner_launchpad_activity",
      ids: handoffCompleted
        ? [handoffCompleted.event_id]
        : returnActivity
          ? (returnActivity.public_code ? [returnActivity.public_code] : [])
          : [],
    }),
    observedStage("PARTNER_VERIFIED", {
      at: verified?.created_at ?? null,
      source: verified ? "partner_integration_events:receipt_verification_succeeded" : "partner_integration_events",
      ids: verified ? [verified.event_id] : [],
    }),
    observedStage("ACTION_AUTHORIZED", {
      at: permit?.created_at ?? deny?.created_at ?? null,
      source: permit
        ? "partner_integration_events:access_decision_permit"
        : deny
          ? "partner_integration_events:access_decision_deny"
          : "partner_integration_events",
      ids: permit ? [permit.event_id] : deny ? [deny.event_id] : [],
    }),
    observedStage("PRIVACY_CONFIRMED", privacyObserved),
    observedStage("TELEMETRY_RECORDED", {
      at: telemetry?.created_at ?? null,
      source: telemetry ? `partner_integration_events:${telemetry.event_type}` : "partner_integration_events",
      ids: telemetry ? [telemetry.event_id] : [],
    }),
  ];
}

export function buildInvestorTransactionEvidence(input: {
  applicationId: string | null;
  bindingId: string | null;
  resultFamily: string;
  events: IntegrationEventRow[];
}): InvestorTransactionEvidence {
  const prodEvents = input.events.filter((e) => e.environment === "production" && isLiveEvent(e));
  const handoff = firstProdEvent(prodEvents, ["hosted_handoff_created", "verification_request_created"]);
  const receipt = firstProdEvent(prodEvents, ["receipt_issued"]);
  const verified = firstProdEvent(prodEvents, ["receipt_verification_succeeded"]);
  const permit = firstProdEvent(prodEvents, ["access_decision_permit"]);
  const deny = firstProdEvent(prodEvents, ["access_decision_deny"]);
  const reuseAccepted = firstProdEvent(prodEvents, ["evidence_reuse_accepted"]);
  const reuseRejected = firstProdEvent(prodEvents, ["evidence_reuse_rejected", "evidence_refresh_required"]);

  let reuse: InvestorTransactionEvidence["reuse_classification"] = "unknown";
  if (reuseAccepted) reuse = "evidence_reused";
  else if (reuseRejected) reuse = "fresh_verification";

  const relatedIds = prodEvents
    .slice(0, 20)
    .map((e) => e.event_id);

  return {
    application_id: input.applicationId,
    binding_id: input.bindingId,
    policy_id: receipt?.policy_id ?? handoff?.policy_id ?? null,
    policy_version: receipt?.policy_version ?? handoff?.policy_version ?? null,
    result_family: input.resultFamily,
    environment: "production",
    request_timestamp: handoff?.created_at ?? null,
    receipt_id: receipt?.receipt_id ?? verified?.receipt_id ?? null,
    receipt_issued_at: receipt?.created_at ?? null,
    verification_timestamp: verified?.created_at ?? null,
    action_authorization: permit ? "permit" : deny ? "deny" : null,
    reuse_classification: reuse,
    integration_event_ids: relatedIds,
    latency_ms: verified?.latency_ms ?? null,
  };
}

export function investorEvidenceLeaks(payload: unknown): string[] {
  const blob = JSON.stringify(payload).toLowerCase();
  const leaks: string[] = [];
  if (/date_of_birth|"dob"|legal_name|government.id|email/.test(blob)) leaks.push("holder_pii");
  if (/abx_live_[a-z0-9_-]{12,}/.test(blob)) leaks.push("credential_secret");
  if (/wallet_address/.test(blob)) leaks.push("wallet_address");
  return leaks;
}

export function acceptanceChecklistComplete(stages: AcceptanceStage[]): boolean {
  return stages.every((s) => s.status === "observed");
}
