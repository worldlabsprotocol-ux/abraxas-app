// FILE: lib/passport/reusableEligibility/facts.ts
// Project an internal reusable fact from a current holder receipt. Never partner-visible.

import { createHash } from "crypto";
import { inferPolicyPackFromPolicyId } from "@/lib/partner/launchpad/policyPacks";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import type { InternalReusableFact } from "./contract";

export interface SourceReceiptRow {
  id: string;
  verification_decision_id: string;
  partner_id: string;
  policy_id: string;
  policy_version: number;
  subject_pseudonym_id: string;
  decision_result: string;
  decision_context: string;
  evaluated_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  status: string;
}

export function internalFactId(pseudonym: string, sourceReceiptId: string): string {
  return `fact_${createHash("sha256").update(`${pseudonym}:${sourceReceiptId}`).digest("hex").slice(0, 16)}`;
}

export function projectInternalFact(input: {
  subjectId: string;
  receipt: SourceReceiptRow;
  now?: Date;
}): InternalReusableFact | null {
  const pack = inferPolicyPackFromPolicyId(input.receipt.policy_id);
  if (!pack) return null;
  if (input.receipt.decision_result !== "approved") return null;
  const now = input.now ?? new Date();
  let status: InternalReusableFact["status"] = "active";
  if (input.receipt.status === "revoked" || input.receipt.revoked_at) status = "revoked";
  else if (input.receipt.status === "expired" || (input.receipt.expires_at && new Date(input.receipt.expires_at) < now)) {
    status = "expired";
  }
  const context = input.receipt.decision_context === "sandbox_only" ? "sandbox_only" : "production";
  const pseudonym = subjectPseudonymId(input.subjectId);
  return {
    fact_id: internalFactId(pseudonym, input.receipt.id),
    subject_pseudonym_id: pseudonym,
    pack_id: pack.id,
    policy_version: input.receipt.policy_version,
    minimum_assurance: pack.minimum_assurance,
    result_category: pack.disclosed_result,
    decision_context: context,
    source_decision_id: input.receipt.verification_decision_id,
    source_receipt_id: input.receipt.id,
    issued_at: input.receipt.evaluated_at,
    expires_at: input.receipt.expires_at,
    status,
  };
}

export function factContainsNoPartnerLeak(fact: InternalReusableFact, sourcePartnerId?: string): boolean {
  const text = JSON.stringify({
    pack_id: fact.pack_id,
    policy_version: fact.policy_version,
    result_category: fact.result_category,
    decision_context: fact.decision_context,
    status: fact.status,
  });
  if (sourcePartnerId && text.includes(sourcePartnerId)) return false;
  if (/receipt|dr_|0x[a-f0-9]{20,}|@/i.test(text)) return false;
  return true;
}
