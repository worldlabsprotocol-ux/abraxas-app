// FILE: lib/protocol/decisionReceiptDisplay.ts
// Safe UI view model for live decision receipts — derived from public receipt state + policy catalog.

import type { DecisionReceiptPublicView } from "@/lib/decisionReceipts/types";
import type { PartnerSafeReceiptInvalidationReason } from "@/lib/decisionReceipts/currentValidity/contract";
import type { PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import { buildPolicyPresentationFromPolicyId } from "@/lib/partner/launchpad/policyPresentation";
import { resolveDisclosureProfile, GENERIC_MINIMAL_PROFILE } from "@/lib/privacy/selectiveDisclosure";
import { resolvePartnerDisplayName } from "@/lib/partner/partnerVerifyDisplay";

export type DecisionReceiptVisualStatus =
  | "verified"
  | "pending"
  | "denied"
  | "expired"
  | "revoked"
  | "invalid"
  | "sandbox"
  | "unknown";

export interface DecisionReceiptDisplayModel {
  receiptId: string;
  visualStatus: DecisionReceiptVisualStatus;
  statusLabel: string;
  resultLabel: string;
  disclosedResult: string;
  policyLabel: string;
  policyId: string;
  policyVersion?: number;
  partnerName?: string;
  partnerId?: string;
  validUntil: string | null;
  evaluatedAt?: string;
  environment: "production" | "sandbox";
  environmentLabel: string;
  signatureValid: boolean;
  currentlyValid?: boolean;
  actionPermitted?: boolean;
  denialMessage?: string | null;
  protectedFields: string[];
  sharedLabel: string;
  reuseNotice?: string;
  signingKeyId?: string;
  lifecycleStatus?: string;
  partnerSafeReason?: PartnerSafeReceiptInvalidationReason | string | null;
}

export type ReceiptDisplaySource = DecisionReceiptPublicView | PartnerFlowPublicReceipt;

const PARTNER_SAFE_USER_MESSAGES: Record<string, string> = {
  receipt_revoked: "Receipt no longer valid",
  receipt_expired: "Receipt expired",
  receipt_superseded: "Receipt replaced by a newer result",
  receipt_invalid: "Unable to verify receipt",
  signature_invalid: "Unable to verify receipt",
  evidence_refresh_required: "Evidence refresh required",
  policy_no_longer_valid: "Receipt does not match this request",
  application_inactive: "Receipt not valid for this application",
  partner_inactive: "Receipt not valid for this partner",
  environment_mismatch: "Receipt not valid for this environment",
  verification_incomplete: "Unable to verify receipt",
};

export function humanizeDisclosedResult(disclosedResult: string): string {
  const normalized = disclosedResult.trim();
  if (!normalized) return "Eligibility result";

  const special: Record<string, string> = {
    age_eligible_21: "21+ verified",
    age_eligible_18: "18+ verified",
    residency_check_passed: "Residency verified",
    wallet_control_confirmed: "Wallet control verified",
    credential_active: "Credential active",
    redemption_eligible: "Redemption eligible",
    identity_and_liveness_met: "Identity and liveness verified",
    sandbox_demo_eligible: "Sandbox demo eligible",
    organization_eligible: "Organization eligible",
  };

  if (special[normalized]) return special[normalized];

  return normalized
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function partnerSafeDenialMessage(
  reason: PartnerSafeReceiptInvalidationReason | string | null | undefined,
): string | null {
  if (!reason) return null;
  return PARTNER_SAFE_USER_MESSAGES[reason] ?? "Unable to verify receipt";
}

export function normalizeProtectedFields(policyId: string): string[] {
  const presentation = buildPolicyPresentationFromPolicyId(policyId);
  if (presentation?.withheld?.length) {
    return presentation.withheld.map((item) =>
      item.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    );
  }
  const profile = resolveDisclosureProfile(
    presentation?.pack_id as string | undefined,
  );
  const withheld = profile.ok ? profile.profile.withheld : GENERIC_MINIMAL_PROFILE.withheld;
  return withheld.map((item) =>
    item.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  );
}

function resolveEnvironment(receipt: ReceiptDisplaySource): "production" | "sandbox" {
  if (receipt.decision_context === "sandbox_only") return "sandbox";
  if (receipt.production_usable === false) return "sandbox";
  return "production";
}

function isExpiredByTime(expiresAt: string | null | undefined, now = new Date()): boolean {
  if (!expiresAt) return false;
  const parsed = new Date(expiresAt);
  return !Number.isNaN(parsed.getTime()) && parsed.getTime() <= now.getTime();
}

export function resolveReceiptVisualStatus(
  receipt: ReceiptDisplaySource,
  options?: { now?: Date; actionPermitted?: boolean },
): DecisionReceiptVisualStatus {
  const now = options?.now ?? new Date();

  if (receipt.signature_valid === false) return "invalid";

  if (receipt.decision_result === "denied") return "denied";
  if (receipt.decision_result === "manual_review") return "pending";

  const environment = resolveEnvironment(receipt);
  if (environment === "sandbox") {
    if (receipt.currently_valid === false) {
      if (receipt.status === "revoked" || receipt.lifecycle_status === "revoked") return "revoked";
      if (receipt.status === "expired" || receipt.lifecycle_status === "expired" || isExpiredByTime(receipt.expires_at, now)) {
        return "expired";
      }
      return "invalid";
    }
    return "sandbox";
  }

  if (receipt.status === "revoked" || receipt.lifecycle_status === "revoked") return "revoked";
  if (receipt.status === "expired" || receipt.lifecycle_status === "expired" || isExpiredByTime(receipt.expires_at, now)) {
    return "expired";
  }

  if (receipt.currently_valid === false) {
    if (receipt.partner_safe_reason === "receipt_revoked") return "revoked";
    if (receipt.partner_safe_reason === "receipt_expired") return "expired";
    return "invalid";
  }

  if (receipt.currently_valid === true && receipt.decision_result === "approved" && receipt.signature_valid === true) {
    return options?.actionPermitted === false ? "invalid" : "verified";
  }

  if (
    receipt.currently_valid === undefined &&
    receipt.decision_result === "approved" &&
    receipt.signature_valid === true &&
    receipt.status === "active" &&
    !isExpiredByTime(receipt.expires_at, now)
  ) {
    return options?.actionPermitted === false ? "invalid" : "verified";
  }

  return "unknown";
}

const STATUS_LABELS: Record<DecisionReceiptVisualStatus, string> = {
  verified: "Verified",
  pending: "Pending",
  denied: "Denied",
  expired: "Expired",
  revoked: "Revoked",
  invalid: "Invalid",
  sandbox: "Sandbox verified",
  unknown: "Unable to verify",
};

export function formatReceiptTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function buildDecisionReceiptDisplayModel(
  receipt: ReceiptDisplaySource,
  options?: {
    partnerName?: string;
    actionPermitted?: boolean;
    now?: Date;
  },
): DecisionReceiptDisplayModel {
  const policyId = receipt.policy_id ?? "";
  const presentation = buildPolicyPresentationFromPolicyId(policyId);
  const profileResolved = resolveDisclosureProfile(presentation?.pack_id as string | undefined);
  const resultCategory = profileResolved.ok
    ? profileResolved.profile.result_category
    : presentation?.disclosed_result ?? "eligibility confirmed";

  const environment = resolveEnvironment(receipt);
  const visualStatus = resolveReceiptVisualStatus(receipt, options);
  const partnerId = receipt.partner_id;
  const partnerName = options?.partnerName ?? (partnerId ? resolvePartnerDisplayName(partnerId) : undefined);

  return {
    receiptId: receipt.receipt_id ?? "",
    visualStatus,
    statusLabel: STATUS_LABELS[visualStatus],
    resultLabel: humanizeDisclosedResult(String(resultCategory)),
    disclosedResult: String(resultCategory),
    policyLabel: presentation?.title ?? policyId,
    policyId,
    policyVersion: receipt.policy_version,
    partnerName,
    partnerId,
    validUntil: receipt.expires_at ?? null,
    evaluatedAt: receipt.evaluated_at,
    environment,
    environmentLabel: environment === "sandbox" ? "Sandbox" : "Production",
    signatureValid: receipt.signature_valid === true,
    currentlyValid: receipt.currently_valid,
    actionPermitted: options?.actionPermitted,
    denialMessage: partnerSafeDenialMessage(receipt.partner_safe_reason ?? null),
    protectedFields: normalizeProtectedFields(policyId),
    sharedLabel: presentation?.shared_label ?? humanizeDisclosedResult(String(resultCategory)),
    reuseNotice: presentation?.reuse_notice,
    signingKeyId: "signing_key_id" in receipt ? receipt.signing_key_id : undefined,
    lifecycleStatus: receipt.lifecycle_status ?? receipt.status,
    partnerSafeReason: receipt.partner_safe_reason ?? null,
  };
}

export function receiptDisplayProhibitsIdentityFields(model: DecisionReceiptDisplayModel): string[] {
  const forbidden = [
    "date of birth",
    "government id",
    "legal name",
    "email",
    "selfie",
    "biometric",
    "document",
  ];
  const { protectedFields: _withheldLabels, ...partnerVisible } = model;
  const blob = JSON.stringify(partnerVisible).toLowerCase();
  return forbidden.filter((needle) => blob.includes(needle));
}
