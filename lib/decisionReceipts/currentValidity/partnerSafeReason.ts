// FILE: lib/decisionReceipts/currentValidity/partnerSafeReason.ts
// Map internal invalidation codes to partner-safe lifecycle reasons.

import type { PartnerSafeReceiptInvalidationReason } from "./contract";

export function mapPartnerSafeReceiptReason(
  invalidationReasons: string[],
  lifecycleStatus: string,
): PartnerSafeReceiptInvalidationReason | null {
  const blob = invalidationReasons.join(" ").toLowerCase();
  if (lifecycleStatus === "superseded" || blob.includes("receipt_superseded")) return "receipt_superseded";
  if (lifecycleStatus === "revoked" || blob.includes("receipt_revoked")) return "receipt_revoked";
  if (lifecycleStatus === "expired" || blob.includes("receipt_expired") || blob.includes("claim_expired")) {
    return blob.includes("claim_expired") ? "evidence_refresh_required" : "receipt_expired";
  }
  if (blob.includes("signature_invalid")) return "signature_invalid";
  if (blob.includes("claim_revoked") || blob.includes("claim_suspended") || blob.includes("claim_under_review")) {
    return "evidence_refresh_required";
  }
  if (blob.includes("policy_no_longer_valid") || blob.includes("policy_version")) return "policy_no_longer_valid";
  if (blob.includes("application_inactive") || blob.includes("launchpad_application")) return "application_inactive";
  if (blob.includes("partner_inactive") || blob.includes("partner_suspended")) return "partner_inactive";
  if (blob.includes("production_not_usable") || blob.includes("sandbox_only") || blob.includes("environment")) {
    return "environment_mismatch";
  }
  if (blob.includes("validity_store_unavailable") || blob.includes("verification_incomplete")) {
    return "verification_incomplete";
  }
  if (lifecycleStatus === "invalidated" || invalidationReasons.length > 0) return "receipt_invalid";
  return null;
}
