// FILE: lib/passport/reusableEligibility/issue.ts
// Issue a new partner-bound receipt after fresh consent. Provenance stays internal.

import { createHash } from "crypto";
import type { EvaluatedClaimRef } from "@/lib/decisionReceipts/types";
import { inferPolicyPackFromPolicyId } from "@/lib/partner/launchpad/policyPacks";
import type { InternalReusableFact } from "./contract";
import { recordDerivation } from "./store";

export function derivedClaimRefs(fact: InternalReusableFact, policyId: string): EvaluatedClaimRef[] {
  const pack = inferPolicyPackFromPolicyId(policyId);
  const types = pack?.required_claims?.length ? pack.required_claims : ["product_eligibility"];
  return types.map((claim_type) => ({
    claim_id: `clm_${createHash("sha256").update(`${fact.subject_pseudonym_id}:${pack?.id ?? "pack"}:${claim_type}`).digest("hex").slice(0, 16)}`,
    claim_type,
    issuer_id: "issuer:abraxas",
    status: "active",
    issued_at: fact.issued_at,
    expires_at: fact.expires_at,
  }));
}

export function derivedReasonCodes(): string[] {
  return ["all_claims_met"];
}

export function derivedReceiptLeaksSource(payload: unknown, fact: InternalReusableFact): boolean {
  const text = JSON.stringify(payload);
  if (text.includes(fact.fact_id)) return true;
  if (text.includes(fact.source_receipt_id)) return true;
  if (text.includes(fact.source_decision_id)) return true;
  return false;
}

export async function persistReuseDerivation(input: {
  fact: InternalReusableFact;
  derivedReceiptId: string;
  derivedDecisionId: string;
  requestingPartnerId: string;
  requestingPolicyId: string;
  requestingPolicyVersion: number;
  verifyRequestId: string;
}): Promise<void> {
  await recordDerivation(input);
}
