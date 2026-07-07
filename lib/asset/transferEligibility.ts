// FILE: lib/asset/transferEligibility.ts
// Asset Passport transfer gate — eligible investor + eligible wallet + verified asset.

import { normalizeSuiAddress } from "@mysten/sui/utils";
import { getActiveClaims } from "@/lib/credentials/claimsService";
import { evaluateSubjectPolicy } from "@/lib/verification/requestsService";

export interface TransferEligibilityInput {
  fromWallet: string;
  toWallet: string;
  assetId: string;
  policyId?: string;
}

export interface TransferEligibilityResult {
  allowed: boolean;
  decision: "approved" | "denied" | "manual_review";
  reason_codes: string[];
  from_claims_ok: boolean;
  to_claims_ok: boolean;
  policy_id: string;
}

export async function evaluateTransferEligibility(
  input: TransferEligibilityInput,
): Promise<TransferEligibilityResult> {
  const policyId = input.policyId ?? "abraxas-rwa-us-v1";
  const from = normalizeSuiAddress(input.fromWallet);
  const to = normalizeSuiAddress(input.toWallet);

  const [fromEval, toEval] = await Promise.all([
    evaluateSubjectPolicy(from, policyId),
    evaluateSubjectPolicy(to, policyId),
  ]);

  const fromOk = fromEval.decision === "approved";
  const toOk = toEval.decision === "approved";

  let decision: TransferEligibilityResult["decision"] = "approved";
  const reason_codes: string[] = [];

  if (!fromOk) {
    decision = fromEval.decision;
    reason_codes.push(...fromEval.reason_codes.map(r => `from:${r}`));
  }
  if (!toOk) {
    decision = decision === "approved" ? toEval.decision : "manual_review";
    reason_codes.push(...toEval.reason_codes.map(r => `to:${r}`));
  }

  const fromClaims = await getActiveClaims(from);
  const hasAssetClaim = fromClaims.some(
    c => c.claim_type === "asset_ownership_reviewed" && c.status === "active",
  );
  if (!hasAssetClaim) {
    reason_codes.push("missing:asset_ownership_reviewed");
    decision = decision === "approved" ? "manual_review" : decision;
  }

  const allowed = decision === "approved" && fromOk && toOk && hasAssetClaim;

  return {
    allowed,
    decision,
    reason_codes,
    from_claims_ok: fromOk,
    to_claims_ok: toOk,
    policy_id: policyId,
  };
}
