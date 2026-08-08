// FILE: lib/partner/partnerFlowReceiptAccess.ts
// Partner Flow access validation — fail closed on revoked receipts/credentials.

export const PARTNER_FLOW_REVOCATION_REASON_CODES = ["access_revoked"] as const;

export function isPartnerFlowRevocationReason(invalidationReason: string): boolean {
  return invalidationReason === "receipt_revoked"
    || invalidationReason === "claim_revoked"
    || invalidationReason === "access_revoked"
    || invalidationReason.startsWith("claim_revoked:");
}

export function partnerFlowReceiptAccessBlocked(input: {
  currently_valid: boolean;
  invalidation_reasons: string[];
}): boolean {
  if (input.currently_valid) return false;
  return input.invalidation_reasons.some(isPartnerFlowRevocationReason);
}

export function partnerFlowRevocationDeniedFields(input: {
  currently_valid: boolean;
  validity: string;
  invalidation_reasons: string[];
}): {
  next: "denied";
  currently_valid: false;
  validity: string;
  invalidation_reasons: string[];
  reason_codes: string[];
} {
  const stableReasons = input.invalidation_reasons.filter(isPartnerFlowRevocationReason);
  return {
    next: "denied",
    currently_valid: false,
    validity: input.validity,
    invalidation_reasons: input.invalidation_reasons,
    reason_codes: stableReasons.length > 0 ? stableReasons : [...PARTNER_FLOW_REVOCATION_REASON_CODES],
  };
}
