// FILE: lib/institutional/mandate/contract.ts
// Build 885 — issuer-backed institutional action mandate (controlled fixture contract).

import type { TransactionScopeKind } from "@/lib/institutional/transactionMandateEnforcement";

export const INSTITUTIONAL_MANDATE_DOCUMENT = "abraxas_institutional_mandate" as const;
export const INSTITUTIONAL_MANDATE_SCHEMA_VERSION = "1.0.0" as const;

/** Keys with this reason_class may sign mandates; receipt-only keys must not. */
export const INSTITUTIONAL_MANDATE_ISSUER_REASON_CLASS = "institutional_mandate_issuer" as const;

export type InstitutionalMandatePayload = {
  document: typeof INSTITUTIONAL_MANDATE_DOCUMENT;
  schema_version: typeof INSTITUTIONAL_MANDATE_SCHEMA_VERSION;
  mandate_id: string;
  issuer_id: string;
  issuer_key_id: string;
  tenant_id: string;
  policy_id: string;
  policy_version: number;
  authorized_actor_wallet: string;
  action_type: TransactionScopeKind;
  resource_ref: string;
  max_amount_usd: number;
  destination_fingerprint: string;
  not_before: string;
  not_after: string;
  revoked_at: string | null;
  environment: "demo" | "production";
  issued_at: string;
};

export type SignedInstitutionalMandate = {
  payload: InstitutionalMandatePayload;
  payload_hash: string;
  signature: string;
  signing_key_id: string;
};

export const CONTROLLED_MANDATE_ISSUER_FIXTURE_LABEL =
  "abraxas_controlled_test_mandate_issuer_not_live_institution" as const;
