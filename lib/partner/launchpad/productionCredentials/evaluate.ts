// FILE: lib/partner/launchpad/productionCredentials/evaluate.ts
// Issuance prerequisites. Review approval is required and never sufficient by itself.

import {
  evaluateProductionReviewGates,
  type ProductionReviewGateInput,
} from "@/lib/partner/launchpad/productionReview/evaluate";

export function evaluateProductionCredentialPrereqs(input: ProductionReviewGateInput) {
  const reviewNotApproved = input.request.status !== "approved";
  const shared = evaluateProductionReviewGates({
    ...input,
    request: { ...input.request, status: "pending" },
  });
  const blockers = [
    ...(reviewNotApproved ? ["review_not_approved" as const] : []),
    ...shared.blockers.filter((code) => code !== "request_not_pending"),
  ];
  return {
    ...shared,
    ok: blockers.length === 0,
    blockers,
    activates_mainnet: false as const,
    executes: false as const,
    issues_production_key: false as const,
  };
}

export function productionCredentialState(input: {
  productionApiKeyId: string | null;
  revoked: boolean;
  schemaReady: boolean;
}): "never_issued" | "active" | "revoked" | "unavailable" {
  if (!input.schemaReady) return "unavailable";
  if (!input.productionApiKeyId) return "never_issued";
  if (input.revoked) return "revoked";
  return "active";
}

export function productionCredentialLeaks(payload: unknown, allowOneRaw = false): string[] {
  const blob = JSON.stringify(payload);
  const leaks: string[] = [];
  const liveMatches = blob.match(/abx_live_[A-Za-z0-9_-]{12,}/g) ?? [];
  if (!allowOneRaw && liveMatches.length > 0) leaks.push("raw_live_key");
  if (allowOneRaw && liveMatches.length > 1) leaks.push("duplicate_raw_live_key");
  if (/abx_test_/i.test(blob) && /api_key/.test(blob.toLowerCase())) leaks.push("sandbox_key_in_live_path");
  for (const needle of ["receipt_id", "wallet_address", "callback_url", "allowed_return_urls", "key_hash", "sqlstate"]) {
    if (blob.toLowerCase().includes(needle)) leaks.push(needle);
  }
  return leaks;
}
