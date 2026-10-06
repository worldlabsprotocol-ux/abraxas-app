// FILE: lib/partner/valueEvidence/lifecycle.ts
// Canonical partner lifecycle — technical truth + operator commercial state.

import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import type { PartnerPilotSummary } from "@/lib/partner/pilotEvidence";
import type { LaunchpadActivityRow } from "@/lib/partner/pilotEvidence/load";
import type { CommercialStateRow } from "./store";
import type {
  CommercialLifecycleStage,
  PartnerLifecycleResolution,
  TechnicalLifecycleStage,
  UnifiedLifecycleStage,
} from "./contract";

const STAGE_ORDER: TechnicalLifecycleStage[] = [
  "prospect",
  "design_partner",
  "sandbox_started",
  "integration_verified",
  "pilot_ready",
  "pilot_live",
  "pilot_evidence_available",
  "production_requested",
  "production_approved",
  "production_active",
];

function firstActivity(activity: LaunchpadActivityRow[], types: string[]): string | null {
  for (const row of activity) {
    if (types.includes(row.event_type)) return row.created_at;
  }
  return null;
}

export function resolveTechnicalLifecycle(input: {
  application: LaunchpadApplicationRow;
  pilotSummarySandbox: PartnerPilotSummary;
  pilotSummaryProduction: PartnerPilotSummary | null;
  activity: LaunchpadActivityRow[];
  designPartnerStatus: CommercialStateRow["design_partner_status"] | null;
}): { stage: TechnicalLifecycleStage; entered_at: string | null; evidence: string[] } {
  const evidence: string[] = [];
  const sandbox = input.pilotSummarySandbox;
  const production = input.pilotSummaryProduction;

  if (input.designPartnerStatus === "design_partner" || input.application.created_at) {
    evidence.push("application_exists");
  }

  const configured = firstActivity(input.activity, ["partner_flow_request_configured", "application_provisioned"]);
  const sandboxRequest = sandbox.funnel.find((s) => s.stage === "first_sandbox_request")?.first_at;
  const sandboxReceipt = sandbox.funnel.find((s) => s.stage === "first_sandbox_receipt")?.first_at;
  const verified = sandbox.funnel.find((s) => s.stage === "partner_verification_succeeded")?.first_at;
  const pilotLive = sandbox.funnel.find((s) => s.stage === "holder_flow_completed")?.first_at;
  const prodRequested = firstActivity(input.activity, ["production_access_requested"]) ?? sandbox.funnel.find((s) => s.stage === "production_requested")?.first_at;
  const prodApproved = firstActivity(input.activity, ["production_access_approved", "production_review_approved"]);
  const prodActive = input.application.production_activated_at
    ?? production?.production_status.activated_at
    ?? sandbox.funnel.find((s) => s.stage === "production_activated")?.first_at;

  if (prodActive) {
    evidence.push("production_activated_at");
    return { stage: "production_active", entered_at: prodActive, evidence };
  }
  if (prodApproved) {
    evidence.push("production_access_approved");
    return { stage: "production_approved", entered_at: prodApproved, evidence };
  }
  if (prodRequested) {
    evidence.push("production_access_requested");
    return { stage: "production_requested", entered_at: prodRequested, evidence };
  }
  if (sandbox.metrics.total_requests.value > 0 || sandbox.metrics.receipts_issued.value > 0) {
    evidence.push("pilot_evidence_events");
    const enteredAt = sandbox.time_window.to
      ?? (sandbox.metrics.receipts_issued.value > 0 ? sandboxReceipt : sandboxRequest)
      ?? null;
    return {
      stage: "pilot_evidence_available",
      entered_at: enteredAt,
      evidence,
    };
  }
  if (pilotLive) {
    evidence.push("holder_flow_completed");
    return { stage: "pilot_live", entered_at: pilotLive, evidence };
  }
  if (verified || sandbox.metrics.successful_receipt_verifications.value > 0) {
    evidence.push("receipt_verification_succeeded");
    return { stage: "integration_verified", entered_at: verified ?? null, evidence };
  }
  if (sandboxReceipt || configured) {
    if (sandboxReceipt) evidence.push("receipt_issued");
    if (configured) evidence.push("partner_flow_request_configured");
    return { stage: "pilot_ready", entered_at: sandboxReceipt ?? configured, evidence };
  }
  if (sandboxRequest) {
    evidence.push("verification_request_created");
    return { stage: "sandbox_started", entered_at: sandboxRequest, evidence };
  }
  if (input.designPartnerStatus === "design_partner") {
    evidence.push("design_partner_status");
    return { stage: "design_partner", entered_at: input.application.created_at, evidence };
  }
  return { stage: "prospect", entered_at: input.application.created_at, evidence };
}

export function resolveCommercialLifecycle(commercial: CommercialStateRow | null): {
  stage: CommercialLifecycleStage;
  entered_at: string | null;
} {
  if (!commercial) return { stage: "none", entered_at: null };
  if (commercial.commercial_paused) return { stage: "paused", entered_at: commercial.updated_at };
  if (commercial.commercial_declined) return { stage: "declined", entered_at: commercial.updated_at };
  if (commercial.commercial_converted || commercial.commercial_lifecycle_stage === "converted") {
    return { stage: "converted", entered_at: commercial.effective_from ?? commercial.updated_at };
  }
  if (commercial.design_partner_status === "not_converted") return { stage: "not_converted", entered_at: commercial.updated_at };
  if (commercial.commercial_lifecycle_stage === "commercial_review") {
    return { stage: "commercial_review", entered_at: commercial.effective_from ?? commercial.updated_at };
  }
  return { stage: "none", entered_at: null };
}

export function resolvePartnerLifecycle(input: {
  application: LaunchpadApplicationRow;
  pilotSummarySandbox: PartnerPilotSummary;
  pilotSummaryProduction: PartnerPilotSummary | null;
  activity: LaunchpadActivityRow[];
  commercial: CommercialStateRow | null;
}): PartnerLifecycleResolution {
  const technical = resolveTechnicalLifecycle({
    application: input.application,
    pilotSummarySandbox: input.pilotSummarySandbox,
    pilotSummaryProduction: input.pilotSummaryProduction,
    activity: input.activity,
    designPartnerStatus: input.commercial?.design_partner_status ?? null,
  });
  const commercial = resolveCommercialLifecycle(input.commercial);
  const blockers: string[] = [];

  if (commercial.stage === "converted" && technical.stage !== "production_active") {
    blockers.push("commercial_converted_requires_production_active");
  }
  if (input.commercial?.commercial_converted && !input.application.production_activated_at) {
    blockers.push("production_activation_not_observed");
  }

  let lifecycle_stage: UnifiedLifecycleStage = technical.stage;
  if (commercial.stage === "paused" || commercial.stage === "declined" || commercial.stage === "not_converted") {
    lifecycle_stage = commercial.stage;
  } else if (commercial.stage === "converted") {
    lifecycle_stage = "converted";
  } else if (commercial.stage === "commercial_review" && STAGE_ORDER.indexOf(technical.stage) >= STAGE_ORDER.indexOf("production_active")) {
    lifecycle_stage = "commercial_review";
  }

  return {
    lifecycle_stage,
    technical_stage: technical.stage,
    commercial_stage: commercial.stage,
    stage_entered_at: technical.entered_at ?? commercial.entered_at,
    blockers,
    supporting_evidence: technical.evidence,
  };
}
