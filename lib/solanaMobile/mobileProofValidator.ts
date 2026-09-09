// FILE: lib/solanaMobile/mobileProofValidator.ts
// Fail-closed proof validation for mobile demo — mirrors Wix + tiered age boundaries.

import {
  BROWSE_ARTIFACT_TYPE,
  BROWSE_POLICY_ID,
  GOOD_TROUBLE_PARTNER_ID,
  NEVER_SHARED_FIELDS,
  PURCHASE_ARTIFACT_TYPE,
  PURCHASE_POLICY_ID,
  type BrowseAccessProof,
  type EligibilityDecisionProof,
  type MobileProof,
} from "./mobileProofContract";

export type ValidationResult =
  | { ok: true; proof: MobileProof }
  | { ok: false; code: string };

function isExpired(expiresAt: string, now = Date.now()): boolean {
  const ts = Date.parse(expiresAt);
  return !Number.isFinite(ts) || ts <= now;
}

function hasForbiddenPii(record: Record<string, unknown>): boolean {
  return Object.keys(record).some((key) =>
    NEVER_SHARED_FIELDS.includes(key.toLowerCase() as (typeof NEVER_SHARED_FIELDS)[number]),
  );
}

export function validateBrowseAccessProof(
  proof: Record<string, unknown>,
  opts: { now?: Date; partnerId?: string; policyId?: string } = {},
): ValidationResult {
  const now = opts.now ?? new Date();
  const partnerId = opts.partnerId ?? GOOD_TROUBLE_PARTNER_ID;
  const policyId = opts.policyId ?? BROWSE_POLICY_ID;

  if (!proof || typeof proof !== "object") return { ok: false, code: "payload_missing" };
  if (hasForbiddenPii(proof)) return { ok: false, code: "forbidden_pii" };
  if (proof.artifact_type !== BROWSE_ARTIFACT_TYPE) return { ok: false, code: "artifact_type_mismatch" };
  if (proof.valid_for_purchase !== false) return { ok: false, code: "not_browse_receipt" };
  if (proof.purpose !== "browse") return { ok: false, code: "purpose_mismatch" };
  if (proof.assurance_level !== "L0") return { ok: false, code: "assurance_not_l0" };
  if (proof.age_band !== "over_21") return { ok: false, code: "age_band_mismatch" };
  if (proof.partner_id !== partnerId) return { ok: false, code: "partner_mismatch" };
  if (proof.policy_id !== policyId) return { ok: false, code: "policy_mismatch" };
  if (!proof.expires_at || isExpired(String(proof.expires_at), now.getTime())) {
    return { ok: false, code: "receipt_expired" };
  }

  const validated: BrowseAccessProof = {
    artifact_type: BROWSE_ARTIFACT_TYPE,
    purpose: "browse",
    valid_for_purchase: false,
    assurance_level: "L0",
    partner_id: String(proof.partner_id),
    policy_id: String(proof.policy_id),
    age_band: "over_21",
    receipt_id: String(proof.receipt_id ?? ""),
    issued_at: String(proof.issued_at ?? ""),
    expires_at: String(proof.expires_at),
  };

  return { ok: true, proof: validated };
}

export function validateEligibilityDecisionProof(
  proof: Record<string, unknown>,
  opts: { now?: Date; partnerId?: string; policyId?: string } = {},
): ValidationResult {
  const now = opts.now ?? new Date();
  const partnerId = opts.partnerId ?? GOOD_TROUBLE_PARTNER_ID;
  const policyId = opts.policyId ?? PURCHASE_POLICY_ID;

  if (!proof || typeof proof !== "object") return { ok: false, code: "payload_missing" };
  if (hasForbiddenPii(proof)) return { ok: false, code: "forbidden_pii" };
  if (proof.artifact_type !== PURCHASE_ARTIFACT_TYPE) return { ok: false, code: "artifact_type_mismatch" };
  if (proof.valid_for_purchase !== true) return { ok: false, code: "not_valid_for_purchase" };
  if (proof.purpose !== "purchase") return { ok: false, code: "purpose_mismatch" };
  if (proof.assurance_level !== "L2" && proof.assurance_level !== "L3" && proof.assurance_level !== "L4") {
    return { ok: false, code: "insufficient_assurance" };
  }
  if (proof.partner_id !== partnerId) return { ok: false, code: "partner_mismatch" };
  if (proof.policy_id !== policyId) return { ok: false, code: "policy_mismatch" };
  if (proof.over_21 !== true) return { ok: false, code: "not_over_21" };
  if (!proof.expires_at || isExpired(String(proof.expires_at), now.getTime())) {
    return { ok: false, code: "receipt_expired" };
  }

  const validated: EligibilityDecisionProof = {
    artifact_type: PURCHASE_ARTIFACT_TYPE,
    purpose: "purchase",
    valid_for_purchase: true,
    assurance_level: proof.assurance_level as EligibilityDecisionProof["assurance_level"],
    partner_id: String(proof.partner_id),
    policy_id: String(proof.policy_id),
    decision_result: proof.decision_result === "denied" ? "denied" : "approved",
    over_21: true,
    receipt_id: String(proof.receipt_id ?? ""),
    issued_at: String(proof.issued_at ?? ""),
    expires_at: String(proof.expires_at),
  };

  return { ok: true, proof: validated };
}

/** Regulated purchase gate — never accepts browse proofs, URL flags, or L0. */
export function authorizeRegulatedPurchase(input: {
  proof?: Record<string, unknown> | null;
  urlStatus?: string;
  sessionBrowseFlag?: string;
  walletVerified?: boolean;
  flowConsumed?: boolean;
  replaySeen?: boolean;
}): { authorized: false; code: string } | { authorized: true } {
  if (input.urlStatus === "approved") return { authorized: false, code: "url_status_not_authoritative" };
  if (input.sessionBrowseFlag) return { authorized: false, code: "browse_session_flag_not_checkout" };
  if (input.replaySeen) return { authorized: false, code: "replay_detected" };
  if (!input.walletVerified) return { authorized: false, code: "wallet_not_verified" };
  if (!input.flowConsumed) return { authorized: false, code: "flow_not_consumed" };

  const proof = input.proof;
  if (!proof) return { authorized: false, code: "proof_missing" };

  const browse = validateBrowseAccessProof(proof);
  if (browse.ok) return { authorized: false, code: "browse_receipt_not_valid_for_purchase" };

  const purchase = validateEligibilityDecisionProof(proof);
  if (!purchase.ok) return { authorized: false, code: purchase.code };

  return { authorized: true };
}
