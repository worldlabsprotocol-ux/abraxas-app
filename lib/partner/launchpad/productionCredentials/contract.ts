// FILE: lib/partner/launchpad/productionCredentials/contract.ts
// Operator Production credential issuance. Separate from review approval and Mainnet execution.

export const PRODUCTION_CREDENTIAL_DOCS = "/docs/production-credentials" as const;
export const PRODUCTION_CREDENTIAL_VERSION = "1.0.0" as const;

export const PRODUCTION_CREDENTIAL_NOTICE =
  "Issuing a Production credential creates one abx_live_ API key for the exact approved partner app. The raw credential is shown once and must be stored securely. Issuance does not activate Mainnet, submit transactions, or move funds.";

export const PRODUCTION_CREDENTIAL_CONFIRMATION =
  "This creates an abx_live_ credential for the exact approved partner app. The raw credential is displayed once and must be stored by the operator or partner securely. Issuance does not activate Mainnet, submit transactions, or move funds.";

export const PRODUCTION_CREDENTIAL_STATES = [
  "never_issued",
  "active",
  "revoked",
  "rotating",
  "unavailable",
] as const;
export type ProductionCredentialState = (typeof PRODUCTION_CREDENTIAL_STATES)[number];

export const PRODUCTION_CREDENTIAL_ACTIONS = ["issue", "rotate", "revoke"] as const;
export type ProductionCredentialAction = (typeof PRODUCTION_CREDENTIAL_ACTIONS)[number];

export const PRODUCTION_CREDENTIAL_ALLOWED_BODY_KEYS = ["action", "confirm"] as const;

export const PRODUCTION_CREDENTIAL_CLIENT_OVERRIDE_KEYS = [
  "partner_id",
  "application_id",
  "approval",
  "approved",
  "readiness",
  "policy_id",
  "policy_version",
  "network",
  "network_id",
  "activate_mainnet",
  "activate_production",
  "environment",
  "key_prefix",
  "api_key",
  "production_api_key",
  "raw",
  "hash",
  "expiry",
  "receipt",
  "wallet",
  "callback",
  "transaction",
  "role",
] as const;

export const PRODUCTION_LIVE_KEY_SCOPES = [
  "verify:credential",
  "verify:registry",
  "webhooks:read",
] as const;
