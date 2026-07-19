// FILE: lib/authenticationProof/types.ts
// On-chain authentication proof — Abraxas core artifact.

export const AUTH_PROOF_SCHEMA_VERSION = "1.0.0";

export type AuthenticationEventType =
  | "asset_inquiry"
  | "design_partner_apply"
  | "external_asset_apply"
  | "security_report"
  | "tokenization_request"
  | "asset_submission";

export type AnchorStatus = "signed" | "anchored" | "anchor_failed";

export interface AuthenticationProofPayload {
  proof_id: string;
  schema_version: string;
  event_type: AuthenticationEventType;
  record_id: string;
  payload_hash: string;
  issued_at: string;
  network: string;
}

export interface AuthenticationProofRecord {
  id: string;
  event_type: AuthenticationEventType;
  record_id: string;
  payload_hash: string;
  signature: string;
  signing_key_id: string;
  sui_tx_digest: string | null;
  sui_network: string | null;
  anchor_status: AnchorStatus;
  explorer_url: string | null;
  created_at: string;
}

export interface IssuedAuthenticationProof {
  proof_id: string;
  payload_hash: string;
  signature: string;
  signing_key_id: string;
  anchor_status: AnchorStatus;
  sui_tx_digest: string | null;
  explorer_url: string | null;
  verify_url: string;
}
