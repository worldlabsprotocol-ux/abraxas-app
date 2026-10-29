// FILE: lib/developers/builderExternalIntegrationAcceptance.ts
// Builder integration finish line — correlated partner events + optional platform receipt verification.

import {
  correlateBuilderEnforcementReceipts,
  integrationEventBoundToBuilderContext,
  type BuilderEnforcementBind,
  type CorrelatedEnforcementReceipt,
} from "@/lib/developers/builderEnforcementCorrelation";
import type { BuilderReceiptPlatformVerification } from "@/lib/developers/verifyBuilderEnforcementReceipt.server";
import type { IntegrationEventRow } from "@/lib/partner/integrationObservability/record";

export const BUILDER_INTEGRATION_PHASES = [
  "sandbox_demonstrated",
  "integration_files_ready",
  "awaiting_application_setup",
  "connection_established",
  "verification_received",
  "independent_verification_passed",
  "application_enforcement_confirmed",
] as const;

export type BuilderIntegrationPhase = (typeof BUILDER_INTEGRATION_PHASES)[number];

export type BuilderEnforcementEvidenceClass =
  | "none"
  | "partner_reported"
  | "platform_independently_verified";

export type BuilderExternalEnforcementObserved = {
  permit: boolean;
  deny: boolean;
  indeterminate: boolean;
  /** Platform re-verified permit (not self-reported event alone). */
  verified_permit: boolean;
  /** Platform re-verified deny path. */
  verified_deny: boolean;
};

export type BuilderIntegrationAcceptanceView = {
  phase: BuilderIntegrationPhase;
  phase_label: string;
  completion_headline: string | null;
  assurance_notice: string | null;
  enforcement_evidence_class: BuilderEnforcementEvidenceClass;
  external_enforcement: BuilderExternalEnforcementObserved;
  live_receipt_ids: string[];
  setup_complete: boolean;
  blockers: string[];
};

export function isHarnessReceiptId(receiptId: string | null | undefined): boolean {
  const id = (receiptId ?? "").trim();
  return id.startsWith("dr_harness_");
}

function pickPlatformVerification(
  correlated: CorrelatedEnforcementReceipt[],
  platformByReceipt: Map<string, BuilderReceiptPlatformVerification>,
): {
  verifiedPermitReceipt: string | null;
  verifiedDenyReceipt: string | null;
  verificationUnavailable: boolean;
} {
  let verifiedPermitReceipt: string | null = null;
  let verifiedDenyReceipt: string | null = null;
  let verificationUnavailable = false;

  for (const chain of correlated) {
    const platform = platformByReceipt.get(chain.receipt_id);
    if (!platform) continue;
    if (platform.unavailable) verificationUnavailable = true;
    if (!platform.ok || !platform.cryptographically_authentic) continue;

    if (
      chain.correlated_permit_chain
      && platform.enforcement_action === "permit"
      && platform.currently_acceptable === "yes"
    ) {
      verifiedPermitReceipt = chain.receipt_id;
    }
    if (
      chain.correlated_deny_chain
      && (platform.enforcement_action === "deny" || platform.enforcement_action === "indeterminate")
    ) {
      verifiedDenyReceipt = chain.receipt_id;
    }
  }

  return { verifiedPermitReceipt, verifiedDenyReceipt, verificationUnavailable };
}

export function deriveBuilderIntegrationAcceptance(input: {
  /** UI-only gate: sandbox harness succeeded in this browser session. Does not complete integration. */
  sandboxHarnessSucceeded: boolean;
  events: IntegrationEventRow[];
  bind: BuilderEnforcementBind;
  platformVerifications: BuilderReceiptPlatformVerification[];
}): BuilderIntegrationAcceptanceView {
  const bound = input.events.filter((event) => integrationEventBoundToBuilderContext(event, input.bind));
  const correlated = correlateBuilderEnforcementReceipts(input.events, input.bind);
  const platformByReceipt = new Map(input.platformVerifications.map((row) => [row.receipt_id, row]));

  const liveReceiptIds = correlated.map((chain) => chain.receipt_id);

  const partnerPermit = correlated.some((chain) => chain.correlated_permit_chain);
  const partnerDeny = correlated.some((chain) => chain.correlated_deny_chain);
  const partnerIndeterminate = correlated.some((chain) => chain.partner_reported_indeterminate);

  const { verifiedPermitReceipt, verifiedDenyReceipt, verificationUnavailable } = pickPlatformVerification(
    correlated,
    platformByReceipt,
  );

  const connectionEstablished = bound.some((event) =>
    event.event_type === "hosted_handoff_created"
    || event.event_type === "verification_request_created",
  );
  const verificationReceived = bound.some((event) =>
    event.event_type === "receipt_issued"
    || event.event_type === "hosted_handoff_completed"
    || event.event_type === "receipt_verification_succeeded"
    || event.event_type === "receipt_verification_failed",
  );

  const blockers: string[] = [];
  if (verificationUnavailable) {
    blockers.push("Independent verification material was unavailable for one or more receipts.");
  }
  if (partnerPermit && !verifiedPermitReceipt) {
    blockers.push("Partner reported permit, but Abraxas has not confirmed an independently verified, currently acceptable permit.");
  }
  if (partnerDeny && !verifiedDenyReceipt) {
    blockers.push("Partner reported deny, but Abraxas has not confirmed a verified deny or indeterminate enforcement path.");
  }

  const enforcementConfirmed = Boolean(verifiedPermitReceipt || verifiedDenyReceipt);

  let phase: BuilderIntegrationPhase = "sandbox_demonstrated";
  let phase_label = "Your Abraxas test worked";
  let completion_headline: string | null = null;
  let assurance_notice: string | null = null;
  let enforcement_evidence_class: BuilderEnforcementEvidenceClass = "none";

  if (!input.sandboxHarnessSucceeded) {
    phase_label = "Run a sandbox test first";
  } else if (correlated.length === 0) {
    phase = "integration_files_ready";
    phase_label = "Integration files ready";
    assurance_notice = "Install integration files on your server, then run Check my application.";
  } else if (!connectionEstablished) {
    phase = "awaiting_application_setup";
    phase_label = "Awaiting application setup";
  } else if (!verificationReceived) {
    phase = "connection_established";
    phase_label = "Connection established";
  } else if (!partnerPermit && !partnerDeny && !partnerIndeterminate) {
    phase = "verification_received";
    phase_label = "Verification received";
  } else if (!enforcementConfirmed) {
    phase = "independent_verification_passed";
    phase_label = "Partner activity recorded";
    enforcement_evidence_class = "partner_reported";
    assurance_notice =
      "Integration events were recorded from your application. Abraxas still needs to confirm independent verification before showing completion.";
  } else {
    phase = "application_enforcement_confirmed";
    phase_label = "Application enforcement confirmed";
    enforcement_evidence_class = "platform_independently_verified";
    if (verifiedPermitReceipt && verifiedDenyReceipt) {
      completion_headline = "Your application verified permit and deny enforcement";
    } else if (verifiedPermitReceipt) {
      completion_headline = "Your application independently verified a permit";
    } else {
      completion_headline = "Your application independently verified a deny or indeterminate block";
    }
    assurance_notice =
      "Completion requires correlated partner events plus platform independent verification of the bound receipt.";
  }

  return {
    phase,
    phase_label,
    completion_headline,
    assurance_notice,
    enforcement_evidence_class,
    external_enforcement: {
      permit: partnerPermit,
      deny: partnerDeny,
      indeterminate: partnerIndeterminate,
      verified_permit: Boolean(verifiedPermitReceipt),
      verified_deny: Boolean(verifiedDenyReceipt),
    },
    live_receipt_ids: liveReceiptIds,
    setup_complete: enforcementConfirmed,
    blockers,
  };
}

export function builderIntegrationPhaseDetail(phase: BuilderIntegrationPhase): string {
  switch (phase) {
    case "sandbox_demonstrated":
      return "A sandbox decision and receipt were returned.";
    case "integration_files_ready":
      return "Download the integration files and install them on your server.";
    case "awaiting_application_setup":
      return "Run a verification request from your application backend using its sandbox API key.";
    case "connection_established":
      return "Your application contacted Abraxas with its server credentials.";
    case "verification_received":
      return "Abraxas returned signed decision material to your application flow.";
    case "independent_verification_passed":
      return "Partner-reported verification telemetry is present; platform confirmation is still required.";
    case "application_enforcement_confirmed":
      return "Correlated events and platform verification support permit or deny enforcement in your application.";
    default:
      return "";
  }
}
