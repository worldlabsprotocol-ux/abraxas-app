// FILE: lib/decisionReceipts/service.ts
// Issue, fetch, revoke decision receipts with idempotency.

import { randomBytes } from "crypto";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { appendAuditEvent } from "@/lib/verification/audit";
import { isSandboxPolicyId } from "@/lib/partner/sandboxPartner";
import { buildCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import {
  loadReceiptSigningKey,
  signReceiptPayload,
} from "@/lib/decisionReceipts/signing";
import { recordReceiptClaimDependencies } from "@/lib/decisionReceipts/dependencies";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import { toPartnerView, toPublicView } from "@/lib/decisionReceipts/views";
import { resolveReceiptValidity } from "@/lib/decisionReceipts/validityResolver";
import { evaluateDecisionReceiptTrust } from "@/lib/decisionReceipts/trustEvaluation";
import type {
  DecisionReceiptContext,
  DecisionReceiptRecord,
  IssueDecisionReceiptInput,
} from "@/lib/decisionReceipts/types";

function generateReceiptId(): string {
  return `dr_${randomBytes(12).toString("base64url")}`;
}

function mapRow(row: Record<string, unknown>): DecisionReceiptRecord {
  return {
    id: row.id as string,
    verification_decision_id: row.verification_decision_id as string,
    consent_receipt_id: (row.consent_receipt_id as string | null) ?? null,
    partner_id: row.partner_id as string,
    policy_id: row.policy_id as string,
    policy_version: row.policy_version as number,
    subject_pseudonym_id: row.subject_pseudonym_id as string,
    wallet_binding_ref: (row.wallet_binding_ref as string | null) ?? null,
    decision_result: row.decision_result as DecisionReceiptRecord["decision_result"],
    reason_codes: (row.reason_codes as string[]) ?? [],
    evaluated_claim_refs: (row.evaluated_claim_refs as DecisionReceiptRecord["evaluated_claim_refs"]) ?? [],
    issuer_refs: (row.issuer_refs as string[]) ?? [],
    decision_context: row.decision_context as DecisionReceiptContext,
    evaluated_at: row.evaluated_at as string,
    expires_at: (row.expires_at as string | null) ?? null,
    revoked_at: (row.revoked_at as string | null) ?? null,
    status: row.status as DecisionReceiptRecord["status"],
    schema_version: row.schema_version as string,
    payload_hash: row.payload_hash as string,
    signature: row.signature as string,
    signing_key_id: row.signing_key_id as string,
    anchor_reference: (row.anchor_reference as string | null) ?? null,
    idempotency_key: (row.idempotency_key as string | null) ?? null,
    created_at: row.created_at as string,
  };
}

async function resolveWalletBindingRef(subjectId: string): Promise<string | null> {
  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from("wallet_bindings")
    .select("id")
    .eq("subject_id", subjectId)
    .is("revoked_at", null)
    .order("verified_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

export async function getReceiptByDecisionId(
  verificationDecisionId: string,
): Promise<DecisionReceiptRecord | null> {
  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from("decision_receipts")
    .select("*")
    .eq("verification_decision_id", verificationDecisionId)
    .maybeSingle();
  return data ? mapRow(data as Record<string, unknown>) : null;
}

export async function getReceiptById(receiptId: string): Promise<DecisionReceiptRecord | null> {
  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from("decision_receipts")
    .select("*")
    .eq("id", receiptId)
    .maybeSingle();
  return data ? mapRow(data as Record<string, unknown>) : null;
}

export async function issueDecisionReceipt(
  input: IssueDecisionReceiptInput,
): Promise<DecisionReceiptRecord> {
  const existing = await getReceiptByDecisionId(input.verificationDecisionId);
  if (existing) return existing;

  if (input.idempotencyKey) {
    const sb = requireSupabaseAdmin();
    const { data: byKey } = await sb
      .from("decision_receipts")
      .select("*")
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle();
    if (byKey) return mapRow(byKey as Record<string, unknown>);
  }

  const signingKey = loadReceiptSigningKey();
  if (!signingKey) {
    throw new Error("ABRAXAS_SIGNING_KEY not configured");
  }

  const decisionContext: DecisionReceiptContext =
    input.decisionContext ??
    (isSandboxPolicyId(input.policyId) ? "sandbox_only" : "production");

  const receiptId = generateReceiptId();
  const evaluatedAt = input.evaluatedAt ?? new Date().toISOString();
  const walletBindingRef = await resolveWalletBindingRef(input.subjectId);
  const pseudonym = subjectPseudonymId(input.subjectId);

  const canonical = buildCanonicalPayload({
    receipt_id: receiptId,
    decision_id: input.verificationDecisionId,
    policy_id: input.policyId,
    policy_version: input.policyVersion,
    partner_id: input.partnerId,
    subject_pseudonym_id: pseudonym,
    wallet_binding_ref: walletBindingRef,
    consent_receipt_id: input.consentReceiptId ?? null,
    decision_result: input.decisionResult,
    reason_codes: input.reasonCodes,
    evaluated_claim_refs: input.evaluatedClaimRefs,
    issuer_refs: Array.from(new Set(input.evaluatedClaimRefs.map(r => r.issuer_id))).sort(),
    decision_context: decisionContext,
    evaluated_at: evaluatedAt,
    expires_at: input.expiresAt ?? null,
  });

  const { payloadHash, signature } = signReceiptPayload(canonical, signingKey.privateKeyJwk);

  const sb = requireSupabaseAdmin();
  const { data, error } = await sb.from("decision_receipts").insert({
    id: receiptId,
    verification_decision_id: input.verificationDecisionId,
    consent_receipt_id: input.consentReceiptId ?? null,
    partner_id: input.partnerId,
    policy_id: input.policyId,
    policy_version: input.policyVersion,
    subject_pseudonym_id: pseudonym,
    wallet_binding_ref: walletBindingRef,
    decision_result: input.decisionResult,
    reason_codes: input.reasonCodes,
    evaluated_claim_refs: input.evaluatedClaimRefs,
    issuer_refs: canonical.issuer_refs,
    decision_context: decisionContext,
    evaluated_at: evaluatedAt,
    expires_at: input.expiresAt ?? null,
    status: "active",
    schema_version: canonical.schema_version,
    payload_hash: payloadHash,
    signature,
    signing_key_id: signingKey.signingKeyId,
    anchor_reference: input.anchorReference ?? null,
    idempotency_key: input.idempotencyKey ?? input.verificationDecisionId,
  }).select("*").single();

  if (error) {
    if (error.code === "23505") {
      const retry = await getReceiptByDecisionId(input.verificationDecisionId);
      if (retry) return retry;
    }
    throw new Error(error.message);
  }

  const record = mapRow(data as Record<string, unknown>);

  await recordReceiptClaimDependencies(receiptId, input.evaluatedClaimRefs);

  await appendAuditEvent({
    actor_type: "system",
    actor_id: "abraxas-receipts",
    action: "decision_receipt.issued",
    object_type: "decision_receipt",
    object_id: record.id,
    policy_id: record.policy_id,
    policy_version: record.policy_version,
    metadata: {
      decision_id: record.verification_decision_id,
      decision_result: record.decision_result,
      decision_context: record.decision_context,
    },
  });

  return record;
}

export async function revokeDecisionReceipt(
  receiptId: string,
  actorId: string,
): Promise<DecisionReceiptRecord | null> {
  const sb = requireSupabaseAdmin();
  const now = new Date().toISOString();
  const { data, error } = await sb
    .from("decision_receipts")
    .update({ status: "revoked", revoked_at: now })
    .eq("id", receiptId)
    .eq("status", "active")
    .select("*")
    .maybeSingle();

  if (error || !data) return null;

  await appendAuditEvent({
    actor_type: "admin",
    actor_id: actorId,
    action: "decision_receipt.revoked",
    object_type: "decision_receipt",
    object_id: receiptId,
  });

  return mapRow(data as Record<string, unknown>);
}

export async function consentAllowsPartnerReceipt(
  consentReceiptId: string | null,
  partnerId: string,
): Promise<boolean> {
  if (!consentReceiptId) return false;
  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from("consent_receipts")
    .select("partner_id, revoked_at, expires_at")
    .eq("id", consentReceiptId)
    .maybeSingle();

  if (!data) return false;
  if (data.partner_id !== partnerId) return false;
  if (data.revoked_at) return false;
  if (data.expires_at && new Date(data.expires_at as string) < new Date()) return false;
  return true;
}

export async function getPublicReceipt(receiptId: string) {
  const record = await getReceiptById(receiptId);
  if (!record) return null;
  return toPublicView(record);
}

export async function getPartnerReceipt(receiptId: string, partnerId: string) {
  const record = await getReceiptById(receiptId);
  if (!record) return null;
  if (record.partner_id !== partnerId) return { error: "forbidden" as const };
  const consentOk = await consentAllowsPartnerReceipt(record.consent_receipt_id, partnerId);
  const view = toPartnerView(record, consentOk);
  const trust = await evaluateDecisionReceiptTrust(record, {
    partnerId,
    policyId: record.policy_id,
  });
  return {
    view,
    valid: trust.currently_valid && consentOk,
    status: record.status,
    validity: trust.validity,
    invalidation_reasons: trust.invalidation_reasons,
    currently_valid: trust.currently_valid,
  };
}

export async function listReceiptsForAdmin(limit = 50): Promise<DecisionReceiptRecord[]> {
  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from("decision_receipts")
    .select("*")
    .order("evaluated_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map(row => mapRow(row as Record<string, unknown>));
}

export async function getReceiptAuditTimeline(receiptId: string) {
  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from("audit_events")
    .select("*")
    .eq("object_type", "decision_receipt")
    .eq("object_id", receiptId)
    .order("created_at", { ascending: true });
  return data ?? [];
}

/** Build receipt input from a verification decision row + claims */
export async function issueReceiptForDecision(input: {
  decisionId: string;
  consentReceiptId?: string | null;
  partnerId: string;
  policyId: string;
  policyVersion: number;
  subjectId: string;
  decisionResult: IssueDecisionReceiptInput["decisionResult"];
  reasonCodes: string[];
  claimsJson: Record<string, unknown>;
  evaluatedClaimRefs: IssueDecisionReceiptInput["evaluatedClaimRefs"];
  expiresAt?: string | null;
  decisionContext?: DecisionReceiptContext;
  anchorReference?: string | null;
}): Promise<DecisionReceiptRecord | null> {
  try {
    return await issueDecisionReceipt({
      verificationDecisionId: input.decisionId,
      consentReceiptId: input.consentReceiptId,
      partnerId: input.partnerId,
      policyId: input.policyId,
      policyVersion: input.policyVersion,
      subjectId: input.subjectId,
      decisionResult: input.decisionResult,
      reasonCodes: input.reasonCodes,
      evaluatedClaimRefs: input.evaluatedClaimRefs,
      expiresAt: input.expiresAt,
      decisionContext: input.decisionContext,
      idempotencyKey: input.decisionId,
      anchorReference: input.anchorReference ?? null,
    });
  } catch (e) {
    console.error("[decision_receipt]", e instanceof Error ? e.message : e);
    return null;
  }
}

export { resolveReceiptStatus, toPublicView, toPartnerView } from "@/lib/decisionReceipts/views";
export { resolveReceiptValidity, isReceiptCurrentlyValidSync as isReceiptCurrentlyValid } from "@/lib/decisionReceipts/validityResolver";
