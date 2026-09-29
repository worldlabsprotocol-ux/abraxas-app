// FILE: lib/passport/reusableEligibility/invalidation.ts
// Derived-fact invalidation propagation with cycle protection.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import type { InternalReusableFact } from "./contract";
import { projectInternalFact, type SourceReceiptRow } from "./facts";

const MAX_DERIVATION_DEPTH = 16;

export interface DerivationNode {
  fact_id: string;
  source_receipt_id: string;
  derived_receipt_id: string;
  status: InternalReusableFact["status"];
}

export async function listDerivationsForSourceReceipt(sourceReceiptId: string): Promise<DerivationNode[]> {
  const sb = requireSupabaseAdmin();
  const { data, error } = await sb
    .from("reusable_eligibility_derivations")
    .select("fact_id, source_receipt_id, derived_receipt_id")
    .eq("source_receipt_id", sourceReceiptId);
  if (error) throw new Error("unavailable");
  return (data ?? []).map((row) => ({
    fact_id: String(row.fact_id),
    source_receipt_id: String(row.source_receipt_id),
    derived_receipt_id: String(row.derived_receipt_id),
    status: "active" as const,
  }));
}

export async function getDerivationByDerivedReceipt(derivedReceiptId: string): Promise<{
  fact_id: string;
  source_receipt_id: string;
  derived_receipt_id: string;
  requesting_partner_id: string;
  requesting_policy_id: string;
} | null> {
  const sb = requireSupabaseAdmin();
  const { data, error } = await sb
    .from("reusable_eligibility_derivations")
    .select("fact_id, source_receipt_id, derived_receipt_id, requesting_partner_id, requesting_policy_id")
    .eq("derived_receipt_id", derivedReceiptId)
    .maybeSingle();
  if (error) throw new Error("unavailable");
  if (!data) return null;
  return {
    fact_id: String(data.fact_id),
    source_receipt_id: String(data.source_receipt_id),
    derived_receipt_id: String(data.derived_receipt_id),
    requesting_partner_id: String(data.requesting_partner_id),
    requesting_policy_id: String(data.requesting_policy_id),
  };
}

export async function loadSourceReceiptRow(receiptId: string): Promise<SourceReceiptRow | null> {
  const sb = requireSupabaseAdmin();
  const { data, error } = await sb
    .from("decision_receipts")
    .select("id, verification_decision_id, partner_id, policy_id, policy_version, subject_pseudonym_id, decision_result, decision_context, evaluated_at, expires_at, revoked_at, status")
    .eq("id", receiptId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: String(data.id),
    verification_decision_id: String(data.verification_decision_id),
    partner_id: String(data.partner_id),
    policy_id: String(data.policy_id),
    policy_version: Number(data.policy_version),
    subject_pseudonym_id: String(data.subject_pseudonym_id),
    decision_result: String(data.decision_result),
    decision_context: String(data.decision_context),
    evaluated_at: String(data.evaluated_at),
    expires_at: (data.expires_at as string | null) ?? null,
    revoked_at: (data.revoked_at as string | null) ?? null,
    status: String(data.status),
  };
}

export async function resolveSourceFactForDerivedReceipt(
  derivedReceiptId: string,
  subjectId: string,
  now = new Date(),
): Promise<InternalReusableFact | null> {
  const derivation = await getDerivationByDerivedReceipt(derivedReceiptId);
  if (!derivation) return null;
  const source = await loadSourceReceiptRow(derivation.source_receipt_id);
  if (!source) return null;
  return projectInternalFact({ subjectId, receipt: source, now });
}

export function walkDerivationChain(input: {
  startFactId: string;
  edges: Array<{ fact_id: string; derived_from_fact_id: string | null | undefined }>;
}): { invalid: boolean; reason: string | null; visited: string[] } {
  const visited = new Set<string>();
  let current: string | null | undefined = input.startFactId;
  const path: string[] = [];

  while (current) {
    if (visited.has(current)) {
      return { invalid: true, reason: "derivation_cycle", visited: path };
    }
    visited.add(current);
    path.push(current);
    if (path.length > MAX_DERIVATION_DEPTH) {
      return { invalid: true, reason: "derivation_depth_exceeded", visited: path };
    }
    const edge = input.edges.find((e) => e.fact_id === current);
    current = edge?.derived_from_fact_id ?? null;
  }

  return { invalid: false, reason: null, visited: path };
}

export async function sourceEvidenceStillValidForReceipt(
  derivedReceiptId: string,
  subjectId: string,
  now = new Date(),
): Promise<{ valid: boolean; reasons: string[] }> {
  const fact = await resolveSourceFactForDerivedReceipt(derivedReceiptId, subjectId, now);
  if (!fact) {
    return { valid: true, reasons: [] };
  }
  if (fact.status === "revoked") {
    return { valid: false, reasons: ["source_evidence_revoked"] };
  }
  if (fact.status === "expired") {
    return { valid: false, reasons: ["source_evidence_expired"] };
  }
  if (fact.expires_at && new Date(fact.expires_at) <= now) {
    return { valid: false, reasons: ["source_evidence_expired"] };
  }
  return { valid: true, reasons: [] };
}
