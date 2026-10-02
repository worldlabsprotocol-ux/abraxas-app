// FILE: lib/partner/externalActivation/derive.ts
// Derive developer activation stages from authoritative backend state only.

import { callbackConfigured } from "@/lib/partner/launchpad/journeyState";
import { buildPolicyPresentationFromTemplateId } from "@/lib/partner/launchpad/policyPresentation";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import type { IntegrationEventRow } from "@/lib/partner/integrationObservability/record";
import { isLiveEvent } from "@/lib/partner/pilotEvidence/dedupe";
import {
  DEVELOPER_ACTIVATION_STATES,
  type DeveloperActivationStage,
  type DeveloperActivationStateId,
  type DeveloperActivationView,
  EXTERNAL_ACTIVATION_PATH,
  EXTERNAL_ACTIVATION_QUICKSTART,
} from "./contract";

export interface ActivationDerivationInput {
  application: LaunchpadApplicationRow;
  events: IntegrationEventRow[];
  activity: Array<{ event_type?: string; public_code?: string | null; created_at?: string; metadata?: Record<string, unknown> }>;
  activeSandboxKey: boolean;
  starterKitGenerated: boolean;
  productionRequestPending?: boolean;
  productionActivated?: boolean;
}

function firstAt(
  events: IntegrationEventRow[],
  types: string[],
  env: "sandbox" | "production" = "sandbox",
): { at: string | null; source: string } {
  for (const event of events.filter(isLiveEvent)) {
    if (!types.includes(event.event_type)) continue;
    if (event.environment !== env) continue;
    return { at: event.created_at, source: `partner_integration_events:${event.event_type}` };
  }
  return { at: null, source: "partner_integration_events" };
}

function firstActivity(
  activity: ActivationDerivationInput["activity"],
  codes: string[],
): { at: string | null; source: string } {
  for (const row of activity) {
    const code = row.public_code ?? "";
    if (codes.includes(code) || (row.event_type && codes.includes(row.event_type))) {
      return { at: row.created_at ?? null, source: `partner_launchpad_activity:${code || row.event_type}` };
    }
  }
  return { at: null, source: "partner_launchpad_activity" };
}

function stage(
  id: DeveloperActivationStateId,
  label: string,
  complete: boolean,
  resolved: { at: string | null; source: string },
): DeveloperActivationStage {
  return {
    id,
    label,
    complete,
    at: complete ? resolved.at : null,
    source: resolved.source,
  };
}

export function deriveDeveloperActivation(input: ActivationDerivationInput): DeveloperActivationView {
  const app = input.application;
  const created = { at: app.created_at, source: "partner_launchpad_applications.created_at" };
  const policySelected = Boolean(app.policy_template_id && app.policy_id);
  const callbackOk = callbackConfigured(app.allowed_return_urls);
  const credentialIssued = Boolean(app.api_key_id && input.activeSandboxKey);
  const kitGenerated = input.starterKitGenerated
    || firstActivity(input.activity, ["starter_kit_generated"]).at != null;
  const firstRequest = firstAt(input.events, ["verification_request_created", "hosted_handoff_created"]);
  const firstReceipt = firstAt(input.events, ["receipt_issued"]);
  const firstVerified = firstAt(input.events, ["receipt_verification_succeeded"]);
  const productionRequested = Boolean(input.productionRequestPending)
    || firstActivity(input.activity, ["production_access_requested"]).at != null;
  const productionActivated = Boolean(input.productionActivated)
    || app.environment === "production"
    || firstActivity(input.activity, ["production_application_activated"]).at != null;

  const stages: DeveloperActivationStage[] = [
    stage("application_created", "Application created", true, created),
    stage("policy_selected", "Policy selected", policySelected, policySelected ? created : { at: null, source: created.source }),
    stage("callback_configured", "Callback configured", callbackOk, callbackOk ? created : { at: null, source: "partner_launchpad_applications.allowed_return_urls" }),
    stage("credential_issued", "Sandbox credential issued", credentialIssued, credentialIssued ? created : { at: null, source: "partner_api_keys" }),
    stage("integration_generated", "Integration generated", kitGenerated, kitGenerated ? firstActivity(input.activity, ["starter_kit_generated"]) : { at: null, source: "partner_launchpad_activity" }),
    stage("first_request_created", "First request created", firstRequest.at != null, firstRequest),
    stage("first_receipt_issued", "First receipt issued", firstReceipt.at != null, firstReceipt),
    stage("first_result_verified", "First result verified", firstVerified.at != null, firstVerified),
    stage("production_requested", "Production requested", productionRequested, firstActivity(input.activity, ["production_access_requested"])),
    stage("production_activated", "Production activated", productionActivated, firstActivity(input.activity, ["production_application_activated"])),
  ];

  const current = [...stages].reverse().find((s) => s.complete)?.id ?? "application_created";
  const firstProofComplete = firstVerified.at != null;
  const sandboxComplete = firstProofComplete;

  let primaryAction: DeveloperActivationView["primary_action"];
  if (!policySelected || !callbackOk) {
    primaryAction = {
      label: "Configure callback",
      detail: "Register your development callback URL on the sandbox application.",
      cta: "Configure callback",
      href: `${EXTERNAL_ACTIVATION_PATH}?pack=${encodeURIComponent(app.policy_template_id)}`,
    };
  } else if (!credentialIssued) {
    primaryAction = {
      label: "Create sandbox",
      detail: "Create a sandbox application to receive a one-time server API key.",
      cta: "Create sandbox",
      href: EXTERNAL_ACTIVATION_PATH,
    };
  } else if (!kitGenerated) {
    primaryAction = {
      label: "Generate integration",
      detail: "Generate the Verify with Abraxas starter kit for your platform.",
      cta: "Generate integration",
      href: EXTERNAL_ACTIVATION_PATH,
    };
  } else if (!firstProofComplete) {
    primaryAction = {
      label: "Run first verification",
      detail: "Complete a sandbox verification and confirm the narrow result on your server.",
      cta: "Run first verification",
      href: `/developers/launchpad?app=${encodeURIComponent(app.id)}&view=test`,
    };
  } else if (!productionRequested) {
    primaryAction = {
      label: "Request production access",
      detail: "Sandbox proof is complete. Production remains a reviewed upgrade.",
      cta: "Request production",
      href: `/developers/launchpad?app=${encodeURIComponent(app.id)}&view=go_live`,
    };
  } else {
    primaryAction = {
      label: "View integration health",
      detail: "Monitor sandbox configuration and recent safe failures.",
      cta: "Integration health",
      href: `/developers/launchpad?app=${encodeURIComponent(app.id)}`,
    };
  }

  const nextAction = firstProofComplete
    ? {
      label: productionRequested ? "View integration health" : "Request production access",
      detail: productionRequested
        ? "Track callback, credential, and verification status."
        : "Submit for reviewed production activation when ready.",
      href: productionRequested
        ? `/developers/launchpad?app=${encodeURIComponent(app.id)}`
        : `/developers/launchpad?app=${encodeURIComponent(app.id)}&view=go_live`,
    }
    : {
      label: "Read the quickstart",
      detail: "Copy the canonical Verify with Abraxas server contract.",
      href: EXTERNAL_ACTIVATION_QUICKSTART,
    };

  return {
    contract_version: "1.0.0",
    current_state: current,
    stages,
    sandbox_complete: sandboxComplete,
    first_proof_complete: firstProofComplete,
    production_requested: productionRequested,
    production_activated: productionActivated,
    primary_action: primaryAction,
    next_action: nextAction,
  };
}

export function firstProofSuccessCopy(policyTemplateId: string): {
  requested: string;
  returned: string;
  shared: string[];
  withheld: string[];
} {
  const presentation = buildPolicyPresentationFromTemplateId(policyTemplateId);
  if (!presentation) {
    return {
      requested: "Policy eligibility",
      returned: "Eligible: Yes",
      shared: ["narrow policy result"],
      withheld: ["identity documents", "unrelated Passport data"],
    };
  }
  return {
    requested: presentation.requested_label,
    returned: `Eligible: Yes (${presentation.disclosed_result})`,
    shared: [presentation.shared_label],
    withheld: presentation.withheld.slice(0, 4),
  };
}

export function activationStateIds(): readonly DeveloperActivationStateId[] {
  return DEVELOPER_ACTIVATION_STATES;
}
