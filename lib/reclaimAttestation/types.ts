// FILE: lib/reclaimAttestation/types.ts

import type { ReclaimSessionStatus } from "./contract";

export interface ReclaimSessionRecord {
  session_ref: string;
  holder_hmac: string;
  verify_request_hmac: string;
  policy_hmac: string;
  policy_id: string;
  policy_version: number;
  method_category: "privacy_preserving";
  result_class: string;
  assurance_level: string;
  environment: "sandbox" | "production";
  mapping_id: string;
  provider_id: string;
  provider_version: string;
  nonce_hash: string;
  context_hmac: string;
  callback_ref: string;
  status: ReclaimSessionStatus;
  proof_digest: string | null;
  issued_at: string;
  expires_at: string;
  accepted_at: string | null;
  cancelled_at: string | null;
  issued_receipt: false;
}

export interface ReclaimSessionCreateInput {
  holderSubject: string;
  verifyRequest: string;
  policyId: string;
  policyVersion: number;
  methodCategory: "privacy_preserving";
  resultClass: string;
  assuranceLevel: string;
  environment: "sandbox" | "production";
}
