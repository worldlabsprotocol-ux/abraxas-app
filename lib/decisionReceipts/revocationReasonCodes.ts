// FILE: lib/decisionReceipts/revocationReasonCodes.ts
// Client-safe revocation reason constants (no server dependencies).

export const REVOCATION_REASON_CODES = [
  "operator_security_review",
  "credential_compromised",
  "policy_violation",
  "fraud_investigation",
  "compliance_hold",
  "duplicate_issuance",
  "holder_withdrawal",
] as const;

export type RevocationReasonCode = (typeof REVOCATION_REASON_CODES)[number];

export function isRevocationReasonCode(value: string): value is RevocationReasonCode {
  return (REVOCATION_REASON_CODES as readonly string[]).includes(value);
}
