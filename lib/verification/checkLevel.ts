// FILE: lib/verification/checkLevel.ts
// Hybrid verification gate — when to prompt for Veriff / deep checks.

import { normalizeSuiAddress } from "@mysten/sui/utils";
import { evaluateSubjectPolicy } from "@/lib/verification/requestsService";

export type VerificationAction =
  | "browse"
  | "book_asset"
  | "high_value_transaction"
  | "invest_rwa"
  | "submit_asset";

const ACTION_POLICY: Record<VerificationAction, string | null> = {
  browse: "abraxas-core-v1",
  book_asset: "abraxas-booking-v1",
  high_value_transaction: "abraxas-booking-v1",
  invest_rwa: "abraxas-rwa-us-v1",
  submit_asset: "abraxas-booking-v1",
};

export interface CheckLevelResult {
  needsDeepVerification: boolean;
  decision: "approved" | "denied" | "manual_review";
  policy_id: string | null;
  missing_claims: string[];
  reason_codes: string[];
  currentLevel: "core" | "compliance_started" | "verified";
}

export async function checkVerificationLevel(
  suiAddress: string | null | undefined,
  action: VerificationAction,
): Promise<CheckLevelResult> {
  const policyId = ACTION_POLICY[action] ?? "abraxas-core-v1";

  if (!suiAddress) {
    return {
      needsDeepVerification: action !== "browse",
      decision: action === "browse" ? "approved" : "denied",
      policy_id: policyId,
      missing_claims: action === "browse" ? [] : ["wallet_binding_confirmed"],
      reason_codes: action === "browse" ? [] : ["missing:wallet"],
      currentLevel: "core",
    };
  }

  try {
    const subject = normalizeSuiAddress(suiAddress);
    const result = await evaluateSubjectPolicy(subject, policyId);

    const needsDeep = result.decision !== "approved";
    const hasIdentity = !result.missing_claims.includes("identity_verified");

    return {
      needsDeepVerification: needsDeep,
      decision: result.decision,
      policy_id: policyId,
      missing_claims: result.missing_claims,
      reason_codes: result.reason_codes,
      currentLevel: hasIdentity ? "verified" : needsDeep ? "core" : "compliance_started",
    };
  } catch {
    return {
      needsDeepVerification: action !== "browse",
      decision: "manual_review",
      policy_id: policyId,
      missing_claims: [],
      reason_codes: ["policy_unavailable"],
      currentLevel: "core",
    };
  }
}
