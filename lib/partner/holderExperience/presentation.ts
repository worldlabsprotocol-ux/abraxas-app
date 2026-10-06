// FILE: lib/partner/holderExperience/presentation.ts
// Holder-facing presentation mapping — protocol contracts unchanged, copy humanized.

import {
  inferPolicyPackFromPolicyId,
  policyPackIsSandboxOnly,
  type PolicyPack,
} from "@/lib/partner/launchpad/policyPacks";
import { buildPolicyPresentationFromPolicyId } from "@/lib/partner/launchpad/policyPresentation";
import { resolveDisclosureProfile } from "@/lib/privacy/selectiveDisclosure";
import { WALLET_CONTROL_RESULT_FAMILY } from "@/lib/walletControl/contract";
import type { HolderRequestBrief } from "./brief";

/** Technical result families — never shown as primary copy. */
export type HolderResultFamily = string;

export interface HolderTechnicalDetailsView {
  requestingService: string;
  purpose: string;
  resultRequested: string;
  resultFamily: string;
  environment: string;
  policyTitle: string;
}

export interface HolderVerificationPresentation {
  requesterName: string;
  primaryQuestion: string;
  theyReceive: string;
  staysPrivate: string[];
  proofSource: string | null;
  isSandbox: boolean;
  sandboxBadge: string;
  sandboxDetail: string;
  technical: HolderTechnicalDetailsView;
}

const HOLDER_RESULT_LABELS: Record<string, string> = {
  wallet_control_confirmed: "Wallet control confirmed",
  age_eligible_21: "Age requirement met",
  age_eligible_18: "Age requirement met",
  residency_check_passed: "Residency requirement met",
  credential_active: "Credential active",
  redemption_eligible: "Redemption eligible",
  identity_and_liveness_met: "Identity and liveness verified",
  sandbox_demo_eligible: "Sandbox demo eligible",
  organization_eligible: "Organization eligible",
};

const WALLET_CONTROL_STAYS_PRIVATE = [
  "Your wallet address",
  "Your other connected wallets",
  "Wallet activity and balances",
  "Private keys and seed phrases",
  "Identity documents",
] as const;

const CURRENT_VALIDITY_LABELS = {
  valid: "Still valid",
  current: "Current",
  invalid: "No longer valid",
} as const;

const INVALIDITY_REASON_LABELS: Record<string, string> = {
  receipt_revoked: "Proof was revoked",
  receipt_expired: "Proof expired",
  receipt_superseded: "A newer result replaced this one",
  evidence_refresh_required: "Evidence needs to be refreshed",
  policy_no_longer_valid: "This result no longer matches the request",
};

/** Deterministic holder label for a disclosed result / result family. */
export function humanizeHolderResult(resultFamily: string): string {
  const key = resultFamily.trim();
  if (!key) return "Eligibility confirmed";
  if (HOLDER_RESULT_LABELS[key]) return HOLDER_RESULT_LABELS[key];
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function humanizeCurrentValidity(currentlyValid: boolean | undefined): string {
  if (currentlyValid === true) return CURRENT_VALIDITY_LABELS.current;
  if (currentlyValid === false) return CURRENT_VALIDITY_LABELS.invalid;
  return CURRENT_VALIDITY_LABELS.valid;
}

export function humanizeInvalidityReason(reason: string | null | undefined): string | null {
  if (!reason) return null;
  return INVALIDITY_REASON_LABELS[reason] ?? "This result is no longer usable";
}

function humanizeWithheldItem(item: string): string {
  const normalized = item.trim().toLowerCase();
  const map: Record<string, string> = {
    "date of birth": "Your date of birth",
    "government id images": "Identity documents",
    "legal name": "Your legal name",
    email: "Your email",
    "private keys": "Private keys",
    "seed phrases": "Seed phrases",
    "street address": "Your street address",
    "wallet address": "Your wallet address",
  };
  if (map[normalized]) return map[normalized];
  const titled = item.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return titled.startsWith("Your ") ? titled : `Your ${titled.toLowerCase()}`;
}

function resolveStaysPrivate(pack: PolicyPack | null): string[] {
  if (!pack) {
    return [
      "Your date of birth",
      "Identity documents",
      "Your legal name",
      "Your email",
    ];
  }

  if (pack.disclosed_result === WALLET_CONTROL_RESULT_FAMILY) {
    return [...WALLET_CONTROL_STAYS_PRIVATE];
  }

  const profile = resolveDisclosureProfile(pack.id);
  const withheld = profile.ok ? profile.profile.withheld : pack.partner_does_not_receive;
  return withheld.map(humanizeWithheldItem);
}

function resolvePrimaryQuestion(pack: PolicyPack | null, purpose?: string | null): string {
  if (pack?.id === "wallet_control") {
    return "Confirm you control an eligible wallet";
  }
  if (pack?.id === "age_21_retail") {
    return "Confirm you meet the 21+ requirement";
  }
  if (pack?.holder_explanation) {
    const first = pack.holder_explanation.split(".")[0]?.trim();
    if (first) return first.endsWith("?") ? first : `${first}.`;
  }
  if (purpose) {
    return `Confirm the requested ${purpose.replace(/_/g, " ")}.`;
  }
  return "Confirm the requested eligibility.";
}

function resolveProofSource(pack: PolicyPack | null): string | null {
  if (!pack) return null;
  if (pack.id === "wallet_control") return "Your existing verified wallet proof";
  if (pack.id === "age_21_retail") return "Your existing verified identity proof";
  if (pack.reuse_policy === "session" || pack.reuse_evidence_freshness?.allow_reuse) {
    return "Your existing verified proof";
  }
  return null;
}

export function buildHolderVerificationPresentation(input: {
  partnerName: string;
  policyId: string;
  brief: HolderRequestBrief;
  purpose?: string | null;
  applicationOrigin?: string | null;
}): HolderVerificationPresentation {
  const pack = inferPolicyPackFromPolicyId(input.policyId);
  const presentation = buildPolicyPresentationFromPolicyId(input.policyId);
  const resultFamily = pack?.disclosed_result ?? input.brief.shared_result_category.replace(/^Policy result:\s*/i, "");
  const theyReceive = humanizeHolderResult(resultFamily);
  const sandbox = input.brief.environment_label.toLowerCase().includes("sandbox")
    || Boolean(pack && policyPackIsSandboxOnly(pack));

  return {
    requesterName: input.partnerName.trim() || input.brief.requestor,
    primaryQuestion: resolvePrimaryQuestion(pack, input.purpose),
    theyReceive,
    staysPrivate: resolveStaysPrivate(pack),
    proofSource: resolveProofSource(pack),
    isSandbox: sandbox,
    sandboxBadge: "Test request",
    sandboxDetail: "This is a sandbox request. It cannot be used as a production verification.",
    technical: {
      requestingService: input.partnerName.trim() || input.brief.requestor,
      purpose: input.brief.purpose,
      resultRequested: theyReceive,
      resultFamily,
      environment: sandbox ? "Sandbox" : "Production",
      policyTitle: presentation?.title ?? pack?.display_name ?? "Verification policy",
    },
  };
}

export type HolderCheckingPhase = "checking_proof" | "checking_request" | "confirmed" | "idle";

export function resolveHolderCheckingCopy(phase: HolderCheckingPhase): string {
  switch (phase) {
    case "checking_proof":
      return "Checking your existing proof…";
    case "checking_request":
      return "Checking this request…";
    case "confirmed":
      return "Result confirmed";
    default:
      return "";
  }
}

export function mapVerifyPhaseToChecking(phase: string): HolderCheckingPhase {
  switch (phase) {
    case "preparing":
      return "checking_proof";
    case "verifying":
      return "checking_request";
    case "approved":
      return "confirmed";
    default:
      return "idle";
  }
}

/** Primary surface must not expose protocol jargon. */
export const HOLDER_JARGON_PATTERN =
  /\b(wallet_control_confirmed|age_eligible_21|result_family|shared result category|policy result:|assurance l[123]|sandbox_only|session_receipt_hours|credential_id|receipt_id|verify_request)\b/i;

export function primarySurfaceFreeOfJargon(text: string): boolean {
  return !HOLDER_JARGON_PATTERN.test(text);
}
