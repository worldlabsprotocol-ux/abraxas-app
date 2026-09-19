// FILE: lib/partner/solana/clientVisible.ts
// Strip kit results to allow/deny + safe reason. Never send receipt material to the browser.

import type { PartnerIntegrationOutcome } from "@/lib/partner/integrationKit/contract";
import type { PartnerKitSafeResult } from "@/lib/partner/integrationKit/client";
import {
  type SolanaPartnerAction,
  type SolanaSafeReasonCode,
} from "@/lib/partner/solana/contract";

export interface SolanaClientVisibleResult {
  allowed: boolean;
  reason: SolanaSafeReasonCode;
  action: SolanaPartnerAction;
}

export function reasonFromOutcome(outcome: PartnerIntegrationOutcome): SolanaSafeReasonCode {
  switch (outcome) {
    case "permitted":
      return "permitted";
    case "denied":
      return "policy_denied";
    case "expired":
      return "receipt_expired";
    case "revoked":
      return "receipt_revoked";
    case "wrong_partner":
      return "partner_mismatch";
    case "wrong_policy":
    case "wrong_policy_version":
    case "policy_version_missing":
    case "policy_version_unknown":
    case "policy_version_draft":
    case "policy_version_deprecated":
    case "policy_version_not_yet_effective":
    case "policy_version_not_adopted":
      return "policy_mismatch";
    case "environment_mismatch":
      return "environment_mismatch";
    case "retry":
      return "retry";
    default:
      return "invalid";
  }
}

export function toClientVisibleResult(
  result: PartnerKitSafeResult,
  action: SolanaPartnerAction,
): SolanaClientVisibleResult {
  const allowed = result.outcome === "permitted" && result.action === "permit";
  return {
    allowed,
    reason: allowed ? "permitted" : reasonFromOutcome(result.outcome),
    action,
  };
}

export function assertNoSensitiveClientKeys(payload: object): string[] {
  const leaks: string[] = [];
  const blob = JSON.stringify(payload).toLowerCase();
  const needles = [
    "receipt_id",
    "dr_",
    "signature",
    "wallet",
    "email",
    "@",
    "legal_name",
    "date_of_birth",
    "claim_ref",
    "evaluated_claim",
    "jwt",
    "id_token",
  ];
  for (const needle of needles) {
    if (needle === "@") {
      if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(blob)) leaks.push("email_like");
      continue;
    }
    if (blob.includes(needle)) leaks.push(needle);
  }
  return leaks;
}
