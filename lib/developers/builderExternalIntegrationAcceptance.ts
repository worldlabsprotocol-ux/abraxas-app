// FILE: lib/developers/builderExternalIntegrationAcceptance.ts
// Builder-facing integration finish line — derived from server integration events + local setup flags only.

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

export type BuilderExternalEnforcementObserved = {
  permit: boolean;
  deny: boolean;
  indeterminate: boolean;
};

export type BuilderIntegrationAcceptanceView = {
  phase: BuilderIntegrationPhase;
  phase_label: string;
  completion_headline: string | null;
  external_enforcement: BuilderExternalEnforcementObserved;
  /** Receipt ids from live partner flows (excludes harness-only ids). */
  live_receipt_ids: string[];
  setup_complete: boolean;
};

export function isHarnessReceiptId(receiptId: string | null | undefined): boolean {
  const id = (receiptId ?? "").trim();
  return id.startsWith("dr_harness_");
}

function externalEvents(events: IntegrationEventRow[]): IntegrationEventRow[] {
  return events.filter((event) => !isHarnessReceiptId(event.receipt_id));
}

export function deriveBuilderIntegrationAcceptance(input: {
  sandboxHarnessSucceeded: boolean;
  integrationFilesReady: boolean;
  serverSetupAcknowledged: boolean;
  events: IntegrationEventRow[];
}): BuilderIntegrationAcceptanceView {
  const live = externalEvents(input.events);
  const liveReceiptIds = Array.from(
    new Set(
      live
        .map((event) => event.receipt_id?.trim())
        .filter((id): id is string => Boolean(id) && !isHarnessReceiptId(id)),
    ),
  );

  const connectionEstablished = live.some((event) =>
    event.event_type === "hosted_handoff_created"
    || event.event_type === "verification_request_created",
  );

  const verificationReceived = live.some((event) =>
    event.event_type === "receipt_issued"
    || event.event_type === "receipt_verification_succeeded"
    || event.event_type === "hosted_handoff_completed",
  );

  const independentPassed = live.some((event) =>
    event.event_type === "receipt_verification_succeeded",
  );

  const permit = live.some((event) => event.event_type === "access_decision_permit");
  const deny = live.some((event) => event.event_type === "access_decision_deny");
  const indeterminate = live.some((event) =>
    event.event_type === "receipt_verification_failed"
    || event.event_type === "receipt_current_validity_failed",
  );

  const enforcementConfirmed = permit || deny;

  let phase: BuilderIntegrationPhase = "sandbox_demonstrated";
  let phase_label = "Your Abraxas test worked";
  let completion_headline: string | null = null;

  if (!input.sandboxHarnessSucceeded) {
    phase = "sandbox_demonstrated";
    phase_label = "Run a sandbox test first";
  } else if (!input.integrationFilesReady) {
    phase = "sandbox_demonstrated";
    phase_label = "Your Abraxas test worked";
  } else if (!input.serverSetupAcknowledged && !connectionEstablished) {
    phase = "integration_files_ready";
    phase_label = "Integration files ready";
  } else if (!connectionEstablished) {
    phase = "awaiting_application_setup";
    phase_label = "Awaiting application setup";
  } else if (!verificationReceived) {
    phase = "connection_established";
    phase_label = "Connection established";
  } else if (!independentPassed && !enforcementConfirmed) {
    phase = "verification_received";
    phase_label = "Verification received";
  } else if (!enforcementConfirmed) {
    phase = "independent_verification_passed";
    phase_label = "Independent verification passed";
  } else {
    phase = "application_enforcement_confirmed";
    phase_label = "Application enforcement confirmed";
    completion_headline = "Abraxas is working in your application";
  }

  return {
    phase,
    phase_label,
    completion_headline,
    external_enforcement: { permit, deny, indeterminate },
    live_receipt_ids: liveReceiptIds,
    setup_complete: enforcementConfirmed,
  };
}

export function builderIntegrationPhaseDetail(phase: BuilderIntegrationPhase): string {
  switch (phase) {
    case "sandbox_demonstrated":
      return "A sandbox decision and receipt were returned.";
    case "integration_files_ready":
      return "Download the integration files and install them on your server.";
    case "awaiting_application_setup":
      return "Start your application backend with the sandbox API key and allowlisted callback.";
    case "connection_established":
      return "Your application contacted Abraxas with its server credentials.";
    case "verification_received":
      return "Abraxas returned signed decision material to your application flow.";
    case "independent_verification_passed":
      return "Your application verified the receipt outside the Abraxas UI.";
    case "application_enforcement_confirmed":
      return "The external application permitted or denied a protected action using verified evidence.";
    default:
      return "";
  }
}
