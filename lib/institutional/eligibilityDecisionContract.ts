// Build #522 — institutional eligibility decision artifact (provider-neutral).

export const INSTITUTIONAL_ELIGIBILITY_DECISION_SCHEMA = "institutional_eligibility_decision_v1" as const;

export type InstitutionalEligibilityOutcome =
  | "permit"
  | "deny"
  | "refresh_required";

export interface InstitutionalEligibilityDecision {
  schema: typeof INSTITUTIONAL_ELIGIBILITY_DECISION_SCHEMA;
  outcome: InstitutionalEligibilityOutcome;
  /** Cryptographic signature verified — may still be expired/revoked. */
  signature_authentic: boolean;
  /** Safe to act on now (fail-closed composite). */
  currently_actionable: boolean;
  partner_id: string;
  application_id: string | null;
  policy_id: string;
  policy_version: number;
  purpose: string | null;
  action_scope: string | null;
  decision_result: string;
  receipt_id: string;
  receipt_expires_at: string | null;
  correlation_id: string;
  validity_state: string;
  invalidation_reasons: string[];
  production_usable: boolean;
  audit_event_id: string | null;
}

export const INSTITUTIONAL_ELIGIBILITY_NOTICE =
  "Institutional eligibility decisions are derived from signed Abraxas decision receipts and continuous validity checks. "
  + "Authentic signatures do not imply current actionability. Never treat partner callbacks as proof without server-side recheck.";
