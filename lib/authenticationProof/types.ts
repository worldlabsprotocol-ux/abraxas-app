// FILE: lib/authenticationProof/types.ts
// On-chain authentication proof — Abraxas core artifact.

export const AUTH_PROOF_SCHEMA_VERSION = "1.0.0";

export type AuthenticationEventType =
  | "asset_inquiry"
  | "design_partner_apply"
  | "external_asset_apply"
  | "security_report"
  | "tokenization_request"
  | "asset_submission"
  | "credential_verify"
  | "asset_state_change";

export type AnchorStatus = "signed" | "anchored" | "anchor_failed";

export type ProofLifecycleStatus = "active" | "refresh_required" | "superseded";

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
  issued_at: string;
  schema_version: string;
  network: string;
  created_at: string;
  status: ProofLifecycleStatus;
  asset_abx_id: string | null;
  superseded_by: string | null;
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
  issued_at: string;
  event_type: AuthenticationEventType;
  record_id: string;
  network: string;
  status?: ProofLifecycleStatus;
}
