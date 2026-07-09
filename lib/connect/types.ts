// FILE: lib/connect/types.ts

export type ConnectAuthorizationStatus =
  | "created"
  | "awaiting_user"
  | "consented"
  | "approved"
  | "denied"
  | "expired"
  | "cancelled";

export interface ConnectAuthorizationRequest {
  id: string;
  partner_id: string;
  policy_id: string;
  requested_action: string | null;
  wallet_address: string | null;
  chain: string;
  chain_id: number | null;
  return_url: string;
  status: ConnectAuthorizationStatus;
  subject_id: string | null;
  verification_request_id: string | null;
  verification_decision_id: string | null;
  consent_receipt_id: string | null;
  receipt_id: string | null;
  reason_codes: string[];
  expires_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface ConnectAuthorizationPublicView {
  authorization_request_id: string;
  partner_id: string;
  policy_id: string;
  requested_action: string | null;
  status: ConnectAuthorizationStatus;
  expires_at: string;
  wallet_address: string | null;
  chain: string;
}

export interface ConnectAuthorizationPartnerView {
  authorization_request_id: string;
  status: ConnectAuthorizationStatus;
  approved: boolean;
  receipt_id: string | null;
  valid_until: string | null;
  reason_codes: string[];
  currently_valid: boolean | null;
  validity: string | null;
}
