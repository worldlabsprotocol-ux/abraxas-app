// FILE: lib/partner/launchpad/institutionalIntegrationWorkspace.ts
// Customer-facing institutional integration workspace model (Build #588).

import type { InstitutionalActivationEvidence } from "@/lib/partner/launchpad/institutionalActivationMilestones";
import type { InstitutionalSdkReleaseView } from "@/lib/institutionalVerification/sdkRelease";
import { INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION } from "@/lib/institutionalVerification/clientSurface";
import {
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_NOTICE,
  sandboxInstitutionalProtocolAccessProductionDenied,
} from "@/lib/partner/sandboxInstitutionalProtocolAccess/contract";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import type { InstitutionalFirstVerifiedOutcomeView } from "@/lib/partner/launchpad/institutionalFirstVerifiedOutcome";

export type InstitutionalIntegrationStepStatus =
  | "complete"
  | "current"
  | "blocked"
  | "pending";

export type InstitutionalIntegrationStepId =
  | "workspace_access"
  | "application_selected"
  | "sandbox_policy_configured"
  | "credentials_and_callback"
  | "hosted_verification"
  | "signed_receipt_retrieval"
  | "sdk_receipt_inspection"
  | "replay_and_revocation"
  | "authorize_decision"
  | "integration_outcome";

export interface InstitutionalIntegrationStep {
  id: InstitutionalIntegrationStepId;
  order: number;
  title: string;
  detail: string;
  status: InstitutionalIntegrationStepStatus;
  action_href: string | null;
  action_label: string | null;
}

export interface InstitutionalApplicationBinding {
  application_id: string;
  public_slug: string;
  display_name: string;
  environment: string;
  partner_id: string;
  policy_id: string;
  policy_version: number;
  policy_template_id: string;
  receipt_audience: string;
  production_blocked: boolean;
  sandbox_notice: string;
}

export interface InstitutionalTrustConfigurationView {
  contract_version: typeof INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION;
  receipt_key_document_digest: string | null;
  receipt_key_environment: string | null;
  bootstrap_notice: string;
  registry_paths: {
    verification_contract: string;
    well_known: string;
    receipt_public_keys: string;
  };
  env_keys: {
    receipt_registry: string;
    pinned_digest: string;
    portable_revocation_issuer_trust: string;
    portable_revocation_bootstrap_trusts: string;
    consumption_store_dir: string;
  };
  trust_errors: string[];
}

export interface InstitutionalExternalVerificationHandoff {
  contract_version: "592.v1";
  status: "operator_required";
  notice: string;
  evidence_command: string;
  runbook_relative_path: string;
  telemetry_disclaimer: string;
}

export interface InstitutionalIntegrationWorkspacePayload {
  contract_version: "591.v1";
  binding: InstitutionalApplicationBinding;
  trust: InstitutionalTrustConfigurationView;
  sdk_release: InstitutionalSdkReleaseView;
  journey_steps: InstitutionalIntegrationStep[];
  activation: InstitutionalActivationEvidence | null;
  first_verified_outcome: InstitutionalFirstVerifiedOutcomeView | null;
  external_verification: InstitutionalExternalVerificationHandoff;
  links: {
    launchpad: string;
    hosted_verification: string;
    institutional_verification_docs: string;
    independent_verifier_handoff: string;
    integration_health_api: string;
  };
}

function milestoneComplete(
  activation: InstitutionalActivationEvidence | null,
  id: string,
): boolean {
  const row = activation?.milestones.find((m) => m.id === id);
  return row?.status === "complete";
}

function firstIncompleteMilestone(
  activation: InstitutionalActivationEvidence | null,
): string | null {
  if (!activation) return "sandbox_application_provisioned";
  const current = activation.milestones.find((m) => m.status === "current" || m.status === "failed");
  return current?.id ?? null;
}

export function buildInstitutionalSdkVerificationSnippet(binding: InstitutionalApplicationBinding): string {
  return `import {
  resolveInstitutionalTrustEnv,
  inspectSignedDecisionReceipt,
  verifySignedDecisionReceipt,
} from "@abraxas/institutional-verification";
import { FileReceiptConsumptionStore } from "@abraxas/institutional-verification/consumption";

const trust = await resolveInstitutionalTrustEnv({
  receipt_verification_registry_json: process.env.ABRAXAS_RECEIPT_VERIFICATION_REGISTRY,
  pinned_receipt_key_document_digest: process.env.ABRAXAS_RECEIPT_KEY_DOCUMENT_DIGEST,
});
if (!trust.ok) throw new Error(trust.code);

const relyingParty = {
  partner_id: ${JSON.stringify(binding.partner_id)},
  policy_id: ${JSON.stringify(binding.policy_id)},
};

const inspected = await inspectSignedDecisionReceipt({
  signed_record: holderReceiptFromYourCallback,
  relying_party: relyingParty,
  request_id: "inspect_only",
  trust_env: trust.env,
});

const store = new FileReceiptConsumptionStore(process.env.RP_CONSUMPTION_DIR!);
const decision = await verifySignedDecisionReceipt({
  signed_record: holderReceiptFromYourCallback,
  relying_party: relyingParty,
  request_id: "authorize_checkout",
  trust_env: trust.env,
  consumption_store: store,
  revocation_source: yourAuthenticatedRevocationFeed,
});

if (!decision.authorize) {
  // rejection_reasons: issuer_untrusted, tenant_policy_mismatch, replay_detected, ...
}`;
}

export function buildInstitutionalIntegrationJourney(input: {
  binding: InstitutionalApplicationBinding;
  activation: InstitutionalActivationEvidence | null;
  sdkDownloadAvailable: boolean;
  trustDigestAvailable: boolean;
  launchpadHref: string;
  hostedVerificationHref: string;
}): InstitutionalIntegrationStep[] {
  const a = input.activation;
  const provisioned = milestoneComplete(a, "sandbox_application_provisioned");
  const configured = milestoneComplete(a, "integration_configured");
  const credentials = milestoneComplete(a, "credentials_generated");
  const connected = milestoneComplete(a, "integration_connected");
  const hostedReady = milestoneComplete(a, "hosted_verification_ready");
  const receiptIssued = milestoneComplete(a, "signed_receipt_issued");
  const independentOk = milestoneComplete(a, "independent_verification_succeeded");

  const currentMilestone = firstIncompleteMilestone(a);

  function statusFor(completed: boolean, prerequisite: boolean): InstitutionalIntegrationStepStatus {
    if (completed) return "complete";
    if (!prerequisite) return "pending";
    if (currentMilestone && !completed) return "current";
    return "current";
  }

  return [
    {
      id: "workspace_access",
      order: 1,
      title: "Access institutional workspace",
      detail: "Authenticate with Partner Launchpad and open this integration workspace for your authorized partner organization.",
      status: "complete",
      action_href: null,
      action_label: null,
    },
    {
      id: "application_selected",
      order: 2,
      title: "Select authorized sandbox application",
      detail: `Application ${input.binding.display_name} (${input.binding.environment}) is pinned to institutional protocol access.`,
      status: provisioned ? "complete" : "current",
      action_href: input.launchpadHref,
      action_label: provisioned ? "Open Launchpad" : "Create sandbox application",
    },
    {
      id: "sandbox_policy_configured",
      order: 3,
      title: "Configure supported sandbox policy",
      detail: `Policy ${input.binding.policy_id} v${input.binding.policy_version}. ${input.binding.sandbox_notice}`,
      status: configured ? "complete" : provisioned ? "current" : "pending",
      action_href: `${input.launchpadHref}&step=connect`,
      action_label: "Configure Partner Flow",
    },
    {
      id: "credentials_and_callback",
      order: 4,
      title: "Configure credentials and callback integration",
      detail: "Issue sandbox API credentials, allowlist HTTPS callback URLs, and deploy starter kit integration files.",
      status: credentials && connected ? "complete" : configured ? "current" : "pending",
      action_href: `${input.launchpadHref}&step=connect`,
      action_label: "Credentials & callback",
    },
    {
      id: "hosted_verification",
      order: 5,
      title: "Initiate hosted holder verification",
      detail: "Open the hosted verification experience bound to this application slug and policy.",
      status: statusFor(hostedReady, connected),
      action_href: input.hostedVerificationHref,
      action_label: "Open hosted verification",
    },
    {
      id: "signed_receipt_retrieval",
      order: 6,
      title: "Obtain signed decision receipt",
      detail: "Retrieve the holder-authorized signed receipt through your callback or authorized Partner API — not a synthetic fixture.",
      status: receiptIssued ? "complete" : hostedReady ? "current" : "pending",
      action_href: `${input.launchpadHref}&step=test`,
      action_label: "Run sandbox test harness",
    },
    {
      id: "sdk_receipt_inspection",
      order: 7,
      title: "Inspect receipt with institutional SDK",
      detail: input.sdkDownloadAvailable
        ? "Install the controlled SDK tarball and run inspect-only verification with pinned digest v2 trust material."
        : "SDK tarball download requires founder authorization. Review install instructions and request access if needed.",
      status: receiptIssued ? (input.sdkDownloadAvailable ? "current" : "blocked") : "pending",
      action_href: "/developers/institutional-verification",
      action_label: "SDK documentation",
    },
    {
      id: "replay_and_revocation",
      order: 8,
      title: "Configure replay and authenticated revocation",
      detail: "Operate durable replay storage on your infrastructure and consume authenticated portable revocation snapshots — unsigned feeds are rejected.",
      status: receiptIssued ? "current" : "pending",
      action_href: "/docs/receipt-key-lifecycle",
      action_label: "Replay & key lifecycle",
    },
    {
      id: "authorize_decision",
      order: 9,
      title: "Authorize or reject policy-scoped decision",
      detail: "Call verifySignedDecisionReceipt with consumption_store and revocation_source. Handle rejection_reasons explicitly.",
      status: independentOk ? "complete" : receiptIssued ? "current" : "pending",
      action_href: "/developers/institutional-verification",
      action_label: "Verifier API reference",
    },
    {
      id: "integration_outcome",
      order: 10,
      title: "Observe integration result and next action",
      detail: independentOk
        ? "Server-side receipt verification telemetry recorded for this tenant. Confirm authorization on your external relying party host before production review."
        : "Integration health shows server-side progress until holder consent, signed receipts, and external SDK verification on your infrastructure.",
      status: independentOk ? "complete" : receiptIssued ? "current" : "pending",
      action_href: input.launchpadHref,
      action_label: "Integration activity",
    },
  ];
}

export function buildInstitutionalIntegrationWorkspace(input: {
  app: LaunchpadApplicationRow;
  sdkRelease: InstitutionalSdkReleaseView;
  activation: InstitutionalActivationEvidence | null;
  firstVerifiedOutcome: InstitutionalFirstVerifiedOutcomeView | null;
  trust: {
    receipt_key_document_digest: string | null;
    receipt_key_environment: string | null;
    bootstrap_notice: string;
  };
  siteUrl: string;
  launchpadHref: string;
}): InstitutionalIntegrationWorkspacePayload {
  const productionBlocked = sandboxInstitutionalProtocolAccessProductionDenied(
    input.app.environment,
    input.app.policy_id,
  );

  const binding: InstitutionalApplicationBinding = {
    application_id: input.app.id,
    public_slug: input.app.public_slug,
    display_name: input.app.display_name || input.app.application_name,
    environment: input.app.environment,
    partner_id: input.app.partner_id,
    policy_id: input.app.policy_id,
    policy_version: input.app.policy_version,
    policy_template_id: input.app.policy_template_id,
    receipt_audience: input.app.partner_id,
    production_blocked: productionBlocked,
    sandbox_notice: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_NOTICE,
  };

  const trustErrors: string[] = [];
  if (!input.trust.receipt_key_document_digest) {
    trustErrors.push(
      "Live receipt key document digest is unavailable in this environment. Ship ABRAXAS_RECEIPT_VERIFICATION_REGISTRY offline until signing infrastructure is activated.",
    );
  }
  if (productionBlocked && input.app.environment === "production") {
    trustErrors.push("sandbox_institutional_protocol_access cannot authorize production receipts.");
  }

  const hostedVerification = `${input.siteUrl}/partner/verify?app=${encodeURIComponent(input.app.public_slug)}`;

  const journey = buildInstitutionalIntegrationJourney({
    binding,
    activation: input.activation,
    sdkDownloadAvailable: input.sdkRelease.download.available,
    trustDigestAvailable: Boolean(input.trust.receipt_key_document_digest),
    launchpadHref: input.launchpadHref,
    hostedVerificationHref: hostedVerification,
  });

  return {
    contract_version: "591.v1",
    binding,
    trust: {
      contract_version: INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION,
      receipt_key_document_digest: input.trust.receipt_key_document_digest,
      receipt_key_environment: input.trust.receipt_key_environment,
      bootstrap_notice: input.trust.bootstrap_notice,
      registry_paths: {
        verification_contract: "/api/trust/verification-contract/v1",
        well_known: "/.well-known/abraxas-trust/v1",
        receipt_public_keys: "/api/receipts/verification-keys",
      },
      env_keys: {
        receipt_registry: "ABRAXAS_RECEIPT_VERIFICATION_REGISTRY",
        pinned_digest: "ABRAXAS_RECEIPT_KEY_DOCUMENT_DIGEST",
        portable_revocation_issuer_trust: "ABRAXAS_PORTABLE_REVOCATION_ISSUER_TRUST",
        portable_revocation_bootstrap_trusts: "ABRAXAS_PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS",
        consumption_store_dir: "RP_CONSUMPTION_DIR",
      },
      trust_errors: trustErrors,
    },
    sdk_release: input.sdkRelease,
    journey_steps: journey,
    activation: input.activation,
    first_verified_outcome: input.firstVerifiedOutcome,
    external_verification: {
      contract_version: "592.v1",
      status: "operator_required",
      notice:
        "External authorization proof is generated on your relying party host with the institutional verification SDK. Launchpad telemetry does not substitute for that execution.",
      evidence_command: "npm run build-592:sandbox-external-evidence",
      runbook_relative_path: "scripts/diagnostics/build592-authorized-sandbox-external-verification.md",
      telemetry_disclaimer:
        "receipt_verification_succeeded records server-side integration outcomes only — not external independent verification.",
    },
    links: {
      launchpad: input.launchpadHref,
      hosted_verification: hostedVerification,
      institutional_verification_docs: "/developers/institutional-verification",
      independent_verifier_handoff: "/docs/partner-handoff/passport-independent-verifier",
      integration_health_api: `/api/launchpad/applications/${input.app.id}/integration-health`,
    },
  };
}
