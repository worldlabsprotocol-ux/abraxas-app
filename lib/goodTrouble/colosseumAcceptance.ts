// FILE: lib/goodTrouble/colosseumAcceptance.ts
// Colosseum acceptance checks — live public receipt vs canonical sandbox verifier.

import {
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_ID,
} from "@/lib/goodTrouble/canonicalProductionConfig";
import { verifyGoodTroubleSandboxAccess } from "@/lib/goodTrouble/sandboxPartnerVerification";
import { CANONICAL_SANDBOX_ONLY_INVALIDATION_REASON } from "@/lib/partner/sandboxReceiptTrustContract";

export interface PublicReceiptTrustSlice {
  receipt_id: string;
  decision_context?: string;
  production_usable?: boolean;
  currently_valid?: boolean;
  invalidation_reasons?: string[];
  policy_id?: string;
  policy_version?: number;
  partner_id?: string;
}

export function expectedSandboxReceiptTrust(): Pick<
  PublicReceiptTrustSlice,
  "decision_context" | "production_usable" | "invalidation_reasons"
> {
  return {
    decision_context: "sandbox_only",
    production_usable: false,
    invalidation_reasons: [CANONICAL_SANDBOX_ONLY_INVALIDATION_REASON],
  };
}

export function receiptTrustMatchesColosseumSandbox(receipt: PublicReceiptTrustSlice): string[] {
  const errors: string[] = [];
  const expected = expectedSandboxReceiptTrust();
  if (receipt.decision_context !== expected.decision_context) {
    errors.push(`decision_context:${receipt.decision_context ?? "missing"}`);
  }
  if (receipt.production_usable !== false) {
    errors.push(`production_usable:${String(receipt.production_usable)}`);
  }
  if (receipt.currently_valid !== true) {
    errors.push("currently_valid:false");
  }
  if (receipt.invalidation_reasons?.some((r) => r.includes("missing_claim"))) {
    errors.push("missing_claim_invalidation");
  }
  if (receipt.policy_id && receipt.policy_id !== GOOD_TROUBLE_CANONICAL_POLICY_ID) {
    errors.push("policy_mismatch");
  }
  if (receipt.partner_id && receipt.partner_id !== GOOD_TROUBLE_CANONICAL_PARTNER_ID) {
    errors.push("partner_mismatch");
  }
  return errors;
}

export async function verifyLiveReceiptWithCanonicalSandboxVerifier(input: {
  receiptId: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
}): Promise<{
  action: "permit" | "deny";
  errors: string[];
  trustSlice: PublicReceiptTrustSlice | null;
}> {
  const baseUrl = input.baseUrl?.replace(/\/$/, "") ?? "https://abraxasworld.xyz";
  const fetchFn = input.fetchFn ?? fetch;
  const publicRes = await fetchFn(`${baseUrl}/api/receipts/${encodeURIComponent(input.receiptId)}/public`);
  let trustSlice: PublicReceiptTrustSlice | null = null;
  if (publicRes.ok) {
    trustSlice = await publicRes.json() as PublicReceiptTrustSlice;
  }
  const result = await verifyGoodTroubleSandboxAccess({
    search: new URLSearchParams({ receipt_id: input.receiptId }),
    baseUrl,
    fetchFn,
  });
  return {
    action: result.action,
    errors: result.errors,
    trustSlice,
  };
}
