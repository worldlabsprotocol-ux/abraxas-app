// FILE: lib/partner/build592/sandboxExecutionAssessment.ts
// Resource readiness for authorized sandbox → external RP verification (Build #592).

export type SandboxResourceStatus =
  | "configured"
  | "obtainable_via_launchpad"
  | "requires_holder_session"
  | "requires_operator_credentials"
  | "requires_founder_authorization"
  | "unavailable_in_agent_environment";

export type SandboxExecutionResourceId =
  | "partner_tenant"
  | "sandbox_application"
  | "institutional_policy"
  | "callback_url"
  | "sandbox_api_credentials"
  | "holder_session"
  | "signed_sandbox_receipt"
  | "sdk_tarball_entitlement"
  | "issuer_trust_registry"
  | "digest_pin"
  | "revocation_evidence"
  | "external_rp_runtime";

export interface SandboxExecutionResourceRow {
  id: SandboxExecutionResourceId;
  label: string;
  status: SandboxResourceStatus;
  detail: string;
  next_action: string | null;
}

export interface SandboxExecutionAssessment {
  contract_version: "592.v1";
  assessed_at: string;
  live_http_journey_possible: boolean;
  external_verification_possible: boolean;
  resources: SandboxExecutionResourceRow[];
  operator_handoff: string;
}

export function assessSandboxExecutionResources(
  env: NodeJS.ProcessEnv = process.env,
): SandboxExecutionAssessment {
  const apiKey = env.BUILD592_PARTNER_API_KEY?.trim()
    ?? env.BUILD584_PARTNER_API_KEY?.trim()
    ?? env.BUILD583_PARTNER_API_KEY?.trim();
  const applicationId = env.BUILD592_APPLICATION_ID?.trim()
    ?? env.BUILD584_APPLICATION_ID?.trim()
    ?? env.BUILD583_APPLICATION_ID?.trim();
  const receiptPath = env.BUILD592_SIGNED_RECEIPT_PATH?.trim();
  const trustRegistry = env.ABRAXAS_RECEIPT_VERIFICATION_REGISTRY?.trim()
    ?? env.BUILD592_TRUST_REGISTRY_PATH?.trim();
  const digestPin = env.ABRAXAS_RECEIPT_KEY_DOCUMENT_DIGEST?.trim();
  const partnerId = env.RP_PARTNER_ID?.trim();
  const policyId = env.RP_POLICY_ID?.trim();
  const consumptionDir = env.RP_CONSUMPTION_DIR?.trim();
  const portableSnapshotPath = env.BUILD592_PORTABLE_REVOCATION_SNAPSHOT_PATH?.trim()
    ?? env.BUILD592_PORTABLE_REVOCATION_SNAPSHOT_JSON?.trim();
  const portableIssuerTrust = env.BUILD592_PORTABLE_REVOCATION_ISSUER_TRUST_JSON?.trim()
    ?? env.ABRAXAS_PORTABLE_REVOCATION_ISSUER_TRUST?.trim();

  const resources: SandboxExecutionResourceRow[] = [
    {
      id: "partner_tenant",
      label: "Authorized partner tenant",
      status: apiKey ? "configured" : "requires_operator_credentials",
      detail: apiKey
        ? "Sandbox API key present in operator environment (value not logged)."
        : "Provision abx_test_… sandbox key from Partner Launchpad.",
      next_action: apiKey ? null : "Launchpad → Sandbox credentials → reveal API key once.",
    },
    {
      id: "sandbox_application",
      label: "Institutional sandbox application",
      status: applicationId ? "configured" : "obtainable_via_launchpad",
      detail: applicationId
        ? `Application id configured (${applicationId.slice(0, 8)}…).`
        : "Create or select sandbox_institutional_protocol_access application.",
      next_action: applicationId ? null : "Launchpad → Create application → institutional protocol access template.",
    },
    {
      id: "institutional_policy",
      label: "Pinned institutional policy",
      status: "obtainable_via_launchpad",
      detail: "Policy binds with sandbox_institutional_protocol_access when template is selected.",
      next_action: "Confirm policy_id on application binding JSON in integration workspace.",
    },
    {
      id: "callback_url",
      label: "Allowlisted callback URL",
      status: "obtainable_via_launchpad",
      detail: "HTTPS or localhost return URL required for hosted verification handoff.",
      next_action: "Launchpad Connect step → add callback URL → save.",
    },
    {
      id: "sandbox_api_credentials",
      label: "Sandbox API credentials",
      status: apiKey ? "configured" : "requires_operator_credentials",
      detail: "Bearer abx_test_… for Launchpad session and partner APIs.",
      next_action: apiKey ? null : "Never commit keys; set BUILD592_PARTNER_API_KEY locally.",
    },
    {
      id: "holder_session",
      label: "Permitted holder session",
      status: "requires_holder_session",
      detail: "Hosted holder consent on /partner/verify cannot be automated without a permitted holder.",
      next_action: "Open hosted verification URL → complete holder authorization in browser.",
    },
    {
      id: "signed_sandbox_receipt",
      label: "Signed sandbox decision receipt",
      status: receiptPath ? "configured" : "requires_holder_session",
      detail: receiptPath
        ? "Operator supplied BUILD592_SIGNED_RECEIPT_PATH (JSON file)."
        : "Obtain signed_record JSON after holder flow or partner callback payload.",
      next_action: receiptPath ? null : "Export receipt JSON to a file; set BUILD592_SIGNED_RECEIPT_PATH.",
    },
    {
      id: "sdk_tarball_entitlement",
      label: "Approved SDK delivery artifact",
      status: "obtainable_via_launchpad",
      detail: "Download authorized @abraxas/institutional-verification tarball from integration workspace when entitled.",
      next_action: "npm run test:institutional-sdk for clean-room smoke on operator machine.",
    },
    {
      id: "issuer_trust_registry",
      label: "Issuer verification registry (offline)",
      status: trustRegistry ? "configured" : "obtainable_via_launchpad",
      detail: trustRegistry
        ? "Trust registry configured via env or BUILD592_TRUST_REGISTRY_PATH."
        : "Pin ABRAXAS_RECEIPT_VERIFICATION_REGISTRY from trust contract / well-known export.",
      next_action: trustRegistry ? null : "Fetch /api/trust/verification-contract/v1 and receipt keys; pin offline.",
    },
    {
      id: "digest_pin",
      label: "Receipt key document digest pin (v2)",
      status: digestPin ? "configured" : "requires_founder_authorization",
      detail: digestPin
        ? "Digest pin present (hash not logged)."
        : "Requires operator-pinned ABRAXAS_RECEIPT_KEY_DOCUMENT_DIGEST when bootstrapping trust from network.",
      next_action: digestPin ? null : "Copy digest from integration workspace trust panel or verification contract.",
    },
    {
      id: "revocation_evidence",
      label: "Authenticated portable revocation snapshot",
      status: portableSnapshotPath && portableIssuerTrust ? "configured" : "requires_operator_credentials",
      detail: portableSnapshotPath && portableIssuerTrust
        ? "Signed portable revocation snapshot path/JSON and issuer trust policy configured."
        : "Production external verification requires signed portable_revocation_snapshot plus pinned issuer trust — not a self-declared active status JSON.",
      next_action: portableSnapshotPath && portableIssuerTrust
        ? null
        : "Export portable snapshot for receipt; set BUILD592_PORTABLE_REVOCATION_SNAPSHOT_PATH and issuer trust JSON.",
    },
    {
      id: "external_rp_runtime",
      label: "External relying party runtime",
      status: consumptionDir && partnerId && policyId ? "configured" : "requires_operator_credentials",
      detail: "Durable FileReceiptConsumptionStore directory plus RP_PARTNER_ID and RP_POLICY_ID.",
      next_action: "Set RP_CONSUMPTION_DIR, RP_PARTNER_ID, RP_POLICY_ID matching receipt scope.",
    },
  ];

  const liveHttp = Boolean(apiKey && applicationId);
  const externalVerify = Boolean(
    receiptPath
    && trustRegistry
    && digestPin
    && partnerId
    && policyId
    && consumptionDir
    && portableSnapshotPath
    && portableIssuerTrust,
  );

  return {
    contract_version: "592.v1",
    assessed_at: new Date().toISOString(),
    live_http_journey_possible: liveHttp,
    external_verification_possible: externalVerify,
    resources,
    operator_handoff:
      "Complete hosted holder authorization, save signed receipt JSON, configure external RP env, then run npm run build-592:sandbox-external-evidence on infrastructure you control.",
  };
}
