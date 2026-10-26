// FILE: lib/decisionReceipts/service.ts
// Issue, fetch, revoke decision receipts with idempotency.

import { randomBytes } from "crypto";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { appendAuditEvent } from "@/lib/verification/audit";
import { isSandboxPolicyId } from "@/lib/partner/sandboxPartner";
import { buildCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import { signReceiptPayload } from "@/lib/decisionReceipts/signing";
import { resolveIssuanceSigningKey } from "@/lib/decisionReceipts/verificationKeyLifecycle";
import { recordReceiptClaimDependencies } from "@/lib/decisionReceipts/dependencies";
import { parseWalletControlEvidenceRef } from "@/lib/walletControl/contract";
import { resolveReceiptSubjectPseudonym } from "@/lib/decisionReceipts/receiptSubjectPseudonym";
import { toPublicView } from "@/lib/decisionReceipts/views.server";
import { toPartnerView } from "@/lib/decisionReceipts/viewsPartner";
import { resolveReceiptValidity } from "@/lib/decisionReceipts/validityResolver.server";
import { evaluateDecisionReceiptTrust } from "@/lib/decisionReceipts/trustEvaluation.server";
import { buildPublicReceiptWithLiveTrust } from "@/lib/decisionReceipts/publicReceiptLiveTrust";
import { mapReceiptRow } from "@/lib/decisionReceipts/mapReceiptRow";
import {
  resolveIssuanceFinalizationSchemaCapability,
  StagedIssuanceUnavailableError,
} from "@/lib/decisionReceipts/issuanceSchemaCapability.server";
import {
  DECISION_RECEIPT_SCHEMA_VERSION,
  type DecisionReceiptContext,
  type DecisionReceiptRecord,
  type IssueDecisionReceiptInput,
} from "@/lib/decisionReceipts/types";
import { resolveIssuanceSchemaVersion } from "@/lib/decisionReceipts/issuanceSchemaV110";
import { DECISION_RECEIPT_SCHEMA_V1_1 } from "@/lib/decisionReceipts/schema/v1_1_0";
import {
  AuthoritativeIssuanceError,
  buildAuthoritativeV11IssuanceFields,
  resolveAuthoritativeApplicationIdForIssuance,
} from "@/lib/decisionReceipts/v1_1_0/authoritativeIssuance.server";
import { buildSignedCanonicalV11, attachV11FieldsFromSidecar } from "@/lib/decisionReceipts/v1_1_0/canonicalIssuance.server";

function generateReceiptId(): string {
  return `dr_${randomBytes(12).toString("base64url")}`;
}

function mapRow(row: Record<string, unknown>): DecisionReceiptRecord {
  return mapReceiptRow(row);
}

async function resolveWalletBindingRefFromClaimRefs(
  claimRefs: IssueDecisionReceiptInput["evaluatedClaimRefs"],
): Promise<string | null> {
  const walletClaimRef = claimRefs.find(ref => ref.claim_type === "wallet_binding_confirmed");
  if (!walletClaimRef) return null;

  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from("credential_claims")
    .select("evidence_reference")
    .eq("id", walletClaimRef.claim_id)
    .maybeSingle();

  const bindingId = parseWalletControlEvidenceRef(
    (data?.evidence_reference as string | null) ?? null,
  );
  return bindingId;
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

  const issuanceSchemaVersion = resolveIssuanceSchemaVersion();
  const signingKey = resolveIssuanceSigningKey({
    schemaVersion: issuanceSchemaVersion,
  });
  if (!signingKey.ok) {
    throw new Error("receipt_signing_unavailable");
  }

  const decisionContext: DecisionReceiptContext =
    input.decisionContext ??
    (isSandboxPolicyId(input.policyId) ? "sandbox_only" : "production");

  const receiptId = generateReceiptId();
  const evaluatedAt = input.evaluatedAt ?? new Date().toISOString();
  const pendingEvidence =
    input.issuanceLifecycle === "pending_evidence_finalization"
    && input.decisionResult === "approved";
  const schemaCapability = await resolveIssuanceFinalizationSchemaCapability();
  if (pendingEvidence && !schemaCapability.stagedIssuanceEnabled) {
    throw new StagedIssuanceUnavailableError();
  }
  const insertStatus = pendingEvidence ? "pending_finalization" : "active";
  const issuanceFinalizedAt = pendingEvidence ? null : evaluatedAt;
  const walletBindingRef = input.walletBindingRef
    ?? await resolveWalletBindingRefFromClaimRefs(input.evaluatedClaimRefs);
  const pseudonymResult = await resolveReceiptSubjectPseudonym({
    claimsSubjectKey: input.subjectId,
    partnerId: input.partnerId,
    applicationId: input.applicationId,
    verificationDecisionId: input.verificationDecisionId,
  });
  if (!pseudonymResult.ok) {
    throw new Error("pairwise_key_missing");
  }
  const pseudonym = pseudonymResult.pseudonym;

  const issuerRefs = Array.from(new Set(input.evaluatedClaimRefs.map(r => r.issuer_id))).sort();
  let anchorReference = input.anchorReference ?? null;
  let payloadHash: string;
  let signature: string;
  let schemaVersionForRow = issuanceSchemaVersion;

  if (issuanceSchemaVersion === DECISION_RECEIPT_SCHEMA_V1_1) {
    let v11Fields;
    const appScope = await resolveAuthoritativeApplicationIdForIssuance({
      verificationDecisionId: input.verificationDecisionId,
      partnerId: input.partnerId,
      callerApplicationId: input.applicationId,
    });
    try {
      v11Fields = await buildAuthoritativeV11IssuanceFields({
        receiptId,
        partnerId: input.partnerId,
        policyId: input.policyId,
        policyVersion: input.policyVersion,
        decisionContext,
        applicationId: appScope.applicationId,
        applicationScopeRequired: appScope.applicationScopeRequired,
        issuancePhase: pendingEvidence ? "pending" : "final",
        externalAnchorReference: input.anchorReference,
      });
    } catch (error) {
      if (error instanceof AuthoritativeIssuanceError) throw error;
      throw error;
    }
    anchorReference = v11Fields.anchor_reference;
    const recordForSign = attachV11FieldsFromSidecar({
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
      issuer_refs: issuerRefs,
      decision_context: decisionContext,
      evaluated_at: evaluatedAt,
      expires_at: input.expiresAt ?? null,
      status: insertStatus,
      schema_version: DECISION_RECEIPT_SCHEMA_V1_1,
      payload_hash: "",
      signature: "",
      signing_key_id: signingKey.key_id,
      anchor_reference: anchorReference,
      idempotency_key: input.idempotencyKey ?? input.verificationDecisionId,
      created_at: evaluatedAt,
      revoked_at: null,
    });
    const { payload } = buildSignedCanonicalV11(recordForSign);
    ({ payloadHash, signature } = signReceiptPayload(
      payload as Parameters<typeof signReceiptPayload>[0],
      signingKey.privateKeyJwk,
    ));
    schemaVersionForRow = DECISION_RECEIPT_SCHEMA_V1_1;
  } else {
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
      issuer_refs: issuerRefs,
      decision_context: decisionContext,
      evaluated_at: evaluatedAt,
      expires_at: input.expiresAt ?? null,
    });
    ({ payloadHash, signature } = signReceiptPayload(canonical, signingKey.privateKeyJwk));
    schemaVersionForRow = canonical.schema_version;
  }

  const sb = requireSupabaseAdmin();
  const insertRow: Record<string, unknown> = {
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
    issuer_refs: issuerRefs,
    decision_context: decisionContext,
    evaluated_at: evaluatedAt,
    expires_at: input.expiresAt ?? null,
    status: insertStatus,
    schema_version: schemaVersionForRow,
    payload_hash: payloadHash,
    signature,
    signing_key_id: signingKey.key_id,
    anchor_reference: anchorReference,
    idempotency_key: input.idempotencyKey ?? input.verificationDecisionId,
  };
  if (schemaCapability.stagedIssuanceEnabled) {
    insertRow.issuance_finalized_at = issuanceFinalizedAt;
  }

  const { data, error } = await sb.from("decision_receipts").insert(insertRow).select("*").single();

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
  reasonCode?: import("@/lib/decisionReceipts/revocationControlPlane").RevocationReasonCode,
): Promise<DecisionReceiptRecord | null> {
  const { revokeDecisionReceiptControlled } = await import("@/lib/decisionReceipts/revocationControlPlane");
  const result = await revokeDecisionReceiptControlled({
    receiptId,
    reasonCode: reasonCode ?? "operator_security_review",
    changedBy: actorId,
  });
  if (!result.ok) return null;
  return getReceiptById(receiptId);
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
  return buildPublicReceiptWithLiveTrust(record);
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

export async function listApprovedReceiptsForSubject(
  subjectId: string,
  limit = 25,
): Promise<DecisionReceiptRecord[]> {
  const sb = requireSupabaseAdmin();
  const { data: decisions } = await sb
    .from("verification_decisions")
    .select("id")
    .eq("subject_id", subjectId)
    .order("decided_at", { ascending: false })
    .limit(limit * 2);
  const decisionIds = (decisions ?? []).map((row) => row.id as string);
  if (decisionIds.length === 0) return [];

  const { data: receipts } = await sb
    .from("decision_receipts")
    .select("*")
    .in("verification_decision_id", decisionIds)
    .eq("decision_result", "approved")
    .order("evaluated_at", { ascending: false })
    .limit(limit);
  return (receipts ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

export async function getReceiptOwnedBySubject(input: {
  subjectId: string;
  receiptId: string;
}): Promise<DecisionReceiptRecord | null> {
  const record = await getReceiptById(input.receiptId);
  if (!record) return null;
  const sb = requireSupabaseAdmin();
  const { data: decision } = await sb
    .from("verification_decisions")
    .select("subject_id")
    .eq("id", record.verification_decision_id)
    .maybeSingle();
  if (!decision || (decision.subject_id as string) !== input.subjectId) return null;
  return record;
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
  applicationId?: string | null;
  decisionResult: IssueDecisionReceiptInput["decisionResult"];
  reasonCodes: string[];
  claimsJson: Record<string, unknown>;
  evaluatedClaimRefs: IssueDecisionReceiptInput["evaluatedClaimRefs"];
  walletBindingRef?: string | null;
  expiresAt?: string | null;
  decisionContext?: DecisionReceiptContext;
  anchorReference?: string | null;
  pendingEvidenceFinalization?: boolean;
}): Promise<DecisionReceiptRecord | null> {
  try {
    return await issueDecisionReceipt({
      verificationDecisionId: input.decisionId,
      consentReceiptId: input.consentReceiptId,
      partnerId: input.partnerId,
      policyId: input.policyId,
      policyVersion: input.policyVersion,
      subjectId: input.subjectId,
      applicationId: input.applicationId,
      decisionResult: input.decisionResult,
      reasonCodes: input.reasonCodes,
      evaluatedClaimRefs: input.evaluatedClaimRefs,
      walletBindingRef: input.walletBindingRef ?? null,
      expiresAt: input.expiresAt,
      decisionContext: input.decisionContext,
      idempotencyKey: input.decisionId,
      anchorReference: input.anchorReference ?? null,
      issuanceLifecycle: input.pendingEvidenceFinalization
        ? "pending_evidence_finalization"
        : "immediate",
    });
  } catch (e) {
    if (
      e instanceof StagedIssuanceUnavailableError
      || e instanceof AuthoritativeIssuanceError
    ) {
      throw e;
    }
    console.error("[decision_receipt]", e instanceof Error ? e.message : e);
    return null;
  }
}

export { resolveReceiptStatus, toPublicView } from "@/lib/decisionReceipts/views";
export { toPartnerView } from "@/lib/decisionReceipts/viewsPartner";
export {
  resolveReceiptValidity,
  isReceiptCurrentlyValidSync as isReceiptCurrentlyValid,
} from "@/lib/decisionReceipts/validityResolver.server";
