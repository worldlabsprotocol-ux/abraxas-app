// FILE: lib/protocolVerification/types.ts
// Authoritative evidence verification boundary — Abraxas verifies; issuers retain underlying data.

export type ProtocolVerificationContext = "sandbox_only" | "production";

export type BoundVerificationRequest = {
  request_id: string;
  partner_id: string;
  policy_id: string;
  policy_version: number;
  operation: string;
  resource: string;
  wallet_subject: string;
  expires_at: string;
  disclosure: "minimal";
};

export type EvidencePresentation =
  | { kind: "wallet_session_binding"; wallet_address: string }
  | { kind: "public_receipt"; receipt: Record<string, unknown> }
  | { kind: "unsupported_issuer"; issuer_id: string };

export type EvidenceAdapterResult =
  | { ok: true; claim_refs: Array<{ claim_id: string; claim_type: string; issuer_id: string; status: string }> }
  | { ok: false; code: string; unsupported?: boolean };

export type ProtocolVerificationOutcome =
  | {
      ok: true;
      decision: "approved" | "denied";
      reason_codes: string[];
      result_label: "ephemeral_sandbox_test_only" | "production_eligibility_decision";
      receipt: Record<string, unknown>;
      validate_path: string;
    }
  | { ok: false; code: string; unsupported?: boolean };
