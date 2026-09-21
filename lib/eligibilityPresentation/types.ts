// FILE: lib/eligibilityPresentation/types.ts

import type {
  EligibilityPresentationEnvironment,
  EligibilityPresentationRequestStatus,
  EligibilityPresentationStatus,
} from "./contract";

export interface EligibilityPresentationPayload {
  schema_version: string;
  presentation_ref: string;
  issuer: string;
  audience_hash: string;
  policy_id: string;
  policy_version: number;
  result_category: string;
  currently_valid: boolean;
  environment: EligibilityPresentationEnvironment;
  issued_at: string;
  expires_at: string;
  verifier_nonce: string;
  signing_key_id: string;
  receipt_verification_ref: string;
  selective_disclosure_summary: string;
}

export interface EligibilityPresentationEnvelope {
  media_type: string;
  payload: EligibilityPresentationPayload;
  signature: string;
}

export interface EligibilityPresentationRequestRecord {
  request_ref: string;
  partner_hmac: string;
  audience_hash: string;
  policy_id: string;
  policy_version: number;
  purpose: string;
  action: string;
  action_scope: string;
  environment: EligibilityPresentationEnvironment;
  result_category: string;
  nonce_hash: string;
  status: EligibilityPresentationRequestStatus;
  expires_at: string;
  issued_at: string;
  presentation_ref: string | null;
  source_receipt_id: string | null;
  holder_session_hmac: string | null;
  consent_bound: boolean;
  revoked_at: string | null;
  consumed_at: string | null;
}

export interface EligibilityPresentationRecord {
  presentation_ref: string;
  request_ref: string;
  partner_hmac: string;
  audience_hash: string;
  policy_id: string;
  policy_version: number;
  action: string;
  action_scope: string;
  environment: EligibilityPresentationEnvironment;
  result_category: string;
  nonce_hash: string;
  receipt_verification_ref: string;
  signing_key_id: string;
  payload_hash: string;
  signature: string;
  status: EligibilityPresentationStatus;
  issued_at: string;
  expires_at: string;
  consumed_at: string | null;
  revoked_at: string | null;
  consent_bound: boolean;
}
