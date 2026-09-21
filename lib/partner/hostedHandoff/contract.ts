// FILE: lib/partner/hostedHandoff/contract.ts
// Server-authoritative Hosted Partner Flow handoff. Not OAuth, not a receipt grant.

export const HOSTED_HANDOFF_VERSION = "1.0.0" as const;
export const HOSTED_HANDOFF_DOCS = "/docs/hosted-partner-flow-handoff" as const;
export const HOSTED_HANDOFF_TTL_MS = 15 * 60 * 1000;

export const HOSTED_HANDOFF_NOTICE =
  "A handoff is not an OAuth callback, not a receipt grant, and not a transaction, payment, or trade. The partner backend must re-fetch and verify the current public receipt.";

export const HOSTED_HANDOFF_RUNTIMES = [
  "universal_https",
  "nextjs",
  "express",
  "wix_velo",
  "serverless",
  "mobile_https",
] as const;
export type HostedHandoffRuntime = (typeof HOSTED_HANDOFF_RUNTIMES)[number];

export const HOSTED_HANDOFF_STATUSES = [
  "created",
  "completed",
  "cancelled",
  "expired",
  "consumed",
] as const;
export type HostedHandoffStatus = (typeof HOSTED_HANDOFF_STATUSES)[number];

export const HOSTED_HANDOFF_ALLOWED_KEYS = ["runtime"] as const;

export const HOSTED_HANDOFF_FORBIDDEN_KEYS = [
  "partner_id",
  "policy_id",
  "policy_version",
  "return_url",
  "callback_url",
  "callback",
  "receipt_id",
  "receipt",
  "wallet",
  "credential",
  "oauth",
  "session",
  "activate_production",
  "activate_mainnet",
  "api_key",
  "verify_request",
] as const;

export const HOSTED_HANDOFF_CHECKLIST = [
  "Create the handoff from your backend or Launchpad session.",
  "Send the holder only the Hosted Partner Flow URL.",
  "After completion, re-fetch the current public receipt with Partner Kit.",
  "A callback or deep link is never a grant.",
] as const;
