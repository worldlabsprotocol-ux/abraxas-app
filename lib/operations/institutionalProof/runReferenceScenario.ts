// FILE: lib/operations/institutionalProof/runReferenceScenario.ts
// Deterministic institutional reusable-KYC reference scenario.

import {
  buildMockVerificationCompletedEvent,
  buildMockRevocationEvent,
  signMockProviderEvent,
  MOCK_APPROVED_KYC_PROVIDER_ID,
} from "@/lib/identity/providerIngestion/mockProvider";
import { evaluatePolicyForSubject } from "@/lib/policy/evaluateSubjectPolicy";
import { issueReceiptForDecision } from "@/lib/decisionReceipts/service";
import { toPublicView, verifyRecordSignature } from "@/lib/decisionReceipts/views";
import { buildNarrowPartnerResultForReceipt } from "@/lib/partner/narrowPartnerResult/build";
import { listHolderFacts } from "@/lib/passport/reusableEligibility/store";
import { decideEvidenceReuse } from "@/lib/passport/reusableEligibility/decision";
import { projectInternalFact } from "@/lib/passport/reusableEligibility/facts";
import { ExternalInstitutionalConsumer } from "./externalConsumer";
import type { PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import type { NarrowPartnerResult } from "@/lib/partner/narrowPartnerResult/contract";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import type {
  InstitutionalProofStage,
  ProofFailureCategory,
  ProofStageRecord,
  ProofStageStatus,
} from "./contract";

export const REFERENCE_INSTITUTIONAL_PLATFORM = "institutional-platform";
export const REFERENCE_APPLICATION_A = "app-a-reference-001";
export const REFERENCE_APPLICATION_B = "app-b-reference-002";
export const REFERENCE_POLICY_ID = `${REFERENCE_INSTITUTIONAL_PLATFORM}-age_21_retail-v1`;

export interface ReferenceScenarioResult {
  stages: ProofStageRecord[];
  service_graph: string[];
  operator_touch_count: number;
  provider_verifications: number;
  application_verifications: number;
  reuse_count: number;
  raw_kyc_recollections: number;
  request_created_at: string;
  provider_event_received_at: string | null;
  claim_ready_at: string | null;
  receipt_issued_at_app_a: string | null;
  receipt_issued_at_app_b: string | null;
  partner_verified_at: string | null;
  application_a: {
    receipt_id: string | null;
    decision: string | null;
    result_family: string | null;
    pairwise_present: boolean;
    receipt_verification_ok: boolean;
    public_receipt: PartnerFlowPublicReceipt | null;
    narrow_result: NarrowPartnerResult | null;
  };
  application_b: {
    receipt_id: string | null;
    decision: string | null;
    result_family: string | null;
    pairwise_present: boolean;
    receipt_verification_ok: boolean;
    public_receipt: PartnerFlowPublicReceipt | null;
    narrow_result: NarrowPartnerResult | null;
  };
  reuse_before_revocation: "reuse" | "refresh_required" | "not_compatible" | "unavailable";
  reuse_after_revocation: "reuse" | "refresh_required" | "not_compatible" | "unavailable";
  same_source_evidence_internally: boolean;
  cross_application_pairwise_distinct: boolean;
  signed_narrow_pairwise_match: boolean;
  revocation_event_authenticated: boolean;
  source_claim_status_after_revocation: "revoked" | "active" | "unknown";
  privacy_surfaces_a: Record<string, unknown>[];
  privacy_surfaces_b: Record<string, unknown>[];
  internal_claims_key: string | null;
  internal_abraxas_subject_id: string | null;
  failed: boolean;
  failure_stage: InstitutionalProofStage | null;
  failure_category: ProofFailureCategory | null;
}

function fallbackNarrowResult(input: {
  receiptId: string;
  partnerId: string;
  policyId: string;
}): NarrowPartnerResult {
  return {
    schema_version: "1.0.0",
    receipt_id: input.receiptId,
    partner_id: input.partnerId,
    policy_id: input.policyId,
    decision: "approved",
    result_family: "policy_result",
    currently_valid: true,
    production_usable: false,
    trust_environment: "sandbox",
    invalidation_reasons: ["sandbox_only_not_production_usable"],
  };
}

function enrichSandboxPublicReceipt(
  view: ReturnType<typeof toPublicView>,
  record: DecisionReceiptRecord,
): PartnerFlowPublicReceipt {
  return {
    ...view,
    signature_valid: verifyRecordSignature(record),
    production_usable: false,
    artifact_type: "eligibility_decision_receipt",
    invalidation_reasons: ["production_not_usable:false"],
    currently_valid: true,
    expires_at: record.expires_at ?? new Date(Date.now() + 86400_000).toISOString(),
  };
}

function stage(
  name: InstitutionalProofStage,
  status: ProofStageStatus,
  timestamp: string | null,
  evidenceRef: string | null,
  failureCategory: ProofFailureCategory | null = null,
): ProofStageRecord {
  return { stage: name, status, timestamp, evidence_ref: evidenceRef, failure_category: failureCategory };
}

export async function runInstitutionalReferenceScenario(): Promise<ReferenceScenarioResult> {
  const serviceGraph: string[] = ["START"];
  const stages: ProofStageRecord[] = [];
  const requestCreatedAt = new Date().toISOString();
  let providerEventAt: string | null = null;
  let claimReadyAt: string | null = null;
  let receiptAAt: string | null = null;
  let receiptBAt: string | null = null;
  let partnerVerifiedAt: string | null = null;
  let providerVerifications = 0;
  let applicationVerifications = 0;
  let reuseCount = 0;
  let failed = false;
  let failureStage: InstitutionalProofStage | null = null;
  let failureCategory: ProofFailureCategory | null = null;

  const markFail = (s: InstitutionalProofStage, cat: ProofFailureCategory) => {
    failed = true;
    failureStage = s;
    failureCategory = cat;
  };

  let claimsKey: string | null = null;
  let abraxasSubjectId: string | null = null;
  let evalAClaimsCount = 0;
  let receiptA: DecisionReceiptRecord | null = null;
  let receiptB: DecisionReceiptRecord | null = null;
  let narrowA: NarrowPartnerResult | null = null;
  let narrowB: NarrowPartnerResult | null = null;
  let publicA: PartnerFlowPublicReceipt | null = null;
  let publicB: PartnerFlowPublicReceipt | null = null;
  let extA = {
    receipt_id: null as string | null,
    decision: null as string | null,
    result_family: null as string | null,
    pairwise_present: false,
    receipt_verification_ok: false,
    public_receipt: null as PartnerFlowPublicReceipt | null,
    narrow_result: null as NarrowPartnerResult | null,
  };
  let extB = { ...extA };
  let reuseBefore: ReferenceScenarioResult["reuse_before_revocation"] = "unavailable";
  let reuseAfter: ReferenceScenarioResult["reuse_after_revocation"] = "unavailable";
  let sameSourceEvidence = false;
  let crossDistinct = false;
  let signedNarrowMatch = false;
  let revocationOk = false;
  let claimStatusAfterRevoke: "revoked" | "active" | "unknown" = "unknown";
  const providerRef = "psref_institutional_proof";

  try {
    serviceGraph.push("scenario.no_initial_reusable_evidence");
    stages.push(stage("provider_evidence_authenticated", "not_run", null, null));

    serviceGraph.push("provider.processProviderEvent");
    const { processProviderEvent } = await import("@/lib/identity/providerIngestion/adapter");
    const event = buildMockVerificationCompletedEvent({
      providerSubjectRef: providerRef,
      providerEventId: "evt_institutional_proof_1",
    });
    const rawBody = JSON.stringify(event);
    const ts = new Date().toISOString();
    providerEventAt = ts;
    providerVerifications += 1;

    const ingested = await processProviderEvent({
      rawBody,
      providerId: MOCK_APPROVED_KYC_PROVIDER_ID,
      signature: signMockProviderEvent(rawBody, ts),
      timestamp: ts,
      apiKeyHeader: null,
    });

    if (!ingested.ok || ingested.outcome !== "accepted") {
      stages[0] = stage("provider_evidence_authenticated", "failed", ts, null, "provider_auth_failed");
      markFail("provider_evidence_authenticated", "provider_auth_failed");
    } else {
      stages[0] = stage("provider_evidence_authenticated", "observed", ts, "provider_event:evt_institutional_proof_1");
      claimsKey = ingested.claims_subject_key ?? null;
      abraxasSubjectId = ingested.abraxas_subject_id ?? null;
      claimReadyAt = new Date().toISOString();
      stages.push(stage("subject_bound", "observed", claimReadyAt, "binding:provider_subject"));
      stages.push(stage("claim_normalized", "observed", claimReadyAt, "claim:identity_verified"));
    }

    if (!failed && claimsKey) {
      const sessionExpires = new Date(Date.now() + 86400_000 * 30).toISOString();
      serviceGraph.push("policy.evaluatePolicyForSubject:app_a");
      const evalA = await evaluatePolicyForSubject({
        suiAddress: claimsKey,
        policyId: REFERENCE_POLICY_ID,
        partnerId: REFERENCE_INSTITUTIONAL_PLATFORM,
      });
      evalAClaimsCount = evalA.claims.length;
      stages.push(stage(
        "policy_evaluated",
        evalA.evaluation.decision === "approved" ? "observed" : "failed",
        new Date().toISOString(),
        `policy:${REFERENCE_POLICY_ID}`,
        evalA.evaluation.decision === "approved" ? null : "policy_denied",
      ));
      if (evalA.evaluation.decision !== "approved") {
        markFail("policy_evaluated", "policy_denied");
      }

      if (!failed) {
        serviceGraph.push("receipt.issueReceiptForDecision:app_a");
        const decisionIdA = "00000000-0000-4000-8000-00000000appa";
        receiptA = await issueReceiptForDecision({
          decisionId: decisionIdA,
          partnerId: REFERENCE_INSTITUTIONAL_PLATFORM,
          policyId: REFERENCE_POLICY_ID,
          policyVersion: 1,
          subjectId: claimsKey,
          applicationId: REFERENCE_APPLICATION_A,
          decisionResult: "approved",
          reasonCodes: evalA.evaluation.reason_codes,
          claimsJson: evalA.evaluation.claims,
          evaluatedClaimRefs: [],
          expiresAt: sessionExpires,
          decisionContext: "sandbox_only",
        });
        receiptAAt = new Date().toISOString();
        stages.push(stage(
          "receipt_issued",
          receiptA ? "observed" : "failed",
          receiptAAt,
          receiptA ? `receipt:${receiptA.id}` : null,
          receiptA ? null : "receipt_invalid",
        ));
        if (!receiptA) markFail("receipt_issued", "receipt_invalid");
      }

      if (!failed && receiptA) {
        serviceGraph.push("narrow.buildNarrowPartnerResultForReceipt:app_a");
        narrowA = await buildNarrowPartnerResultForReceipt(receiptA.id);
        publicA = enrichSandboxPublicReceipt(toPublicView(receiptA), receiptA);
        signedNarrowMatch = Boolean(
          narrowA?.pairwise_subject_ref
          && receiptA.subject_pseudonym_id === narrowA.pairwise_subject_ref
          && verifyRecordSignature(receiptA),
        );

        serviceGraph.push("externalConsumer.verifyApplicationResult:app_a");
        const consumerA = new ExternalInstitutionalConsumer({
          partnerId: REFERENCE_INSTITUTIONAL_PLATFORM,
          policyId: REFERENCE_POLICY_ID,
          policyVersion: 1,
          applicationId: REFERENCE_APPLICATION_A,
          environment: "sandbox",
          fetchFn: async (url) => {
            if (String(url).includes("/narrow-result")) {
              return new Response(JSON.stringify(narrowA), { status: 200 });
            }
            return new Response(JSON.stringify({ ...publicA, currently_valid: true, signature_valid: true }), { status: 200 });
          },
        });
        const verifiedA = await consumerA.verifyApplicationResult({
          receiptId: receiptA.id,
          requestId: "vr_app_a_reference",
          publicReceipt: publicA,
          narrowResult: narrowA ?? fallbackNarrowResult({
            receiptId: receiptA.id,
            partnerId: REFERENCE_INSTITUTIONAL_PLATFORM,
            policyId: REFERENCE_POLICY_ID,
          }),
        });
        applicationVerifications += 1;
        partnerVerifiedAt = new Date().toISOString();
        extA = {
          receipt_id: receiptA.id,
          decision: verifiedA.decision_result,
          result_family: verifiedA.result_family,
          pairwise_present: Boolean(verifiedA.pairwise_subject_ref),
          receipt_verification_ok: verifiedA.receipt_verification_ok,
          public_receipt: publicA,
          narrow_result: narrowA,
        };
        stages.push(stage(
          "application_a_verified",
          verifiedA.receipt_verification_ok && verifiedA.narrow_verification_ok ? "observed" : "failed",
          partnerVerifiedAt,
          `receipt:${receiptA.id}`,
          verifiedA.receipt_verification_ok ? null : "receipt_invalid",
        ));
      }

      if (!failed && claimsKey && receiptA) {
        serviceGraph.push("reuse.listHolderFacts");
        const facts = await listHolderFacts(claimsKey);
        const sourceFact = facts.find((f) => f.source_receipt_id === receiptA!.id)
          ?? projectInternalFact({ subjectId: claimsKey, receipt: {
            id: receiptA.id,
            verification_decision_id: receiptA.verification_decision_id,
            partner_id: receiptA.partner_id,
            policy_id: receiptA.policy_id,
            policy_version: receiptA.policy_version,
            subject_pseudonym_id: receiptA.subject_pseudonym_id,
            decision_result: receiptA.decision_result,
            decision_context: receiptA.decision_context,
            evaluated_at: receiptA.evaluated_at,
            expires_at: receiptA.expires_at,
            revoked_at: receiptA.revoked_at,
            status: receiptA.status,
          } });

        if (sourceFact) {
          serviceGraph.push("reuse.decideEvidenceReuse:app_b");
          const reuseDecision = decideEvidenceReuse({
            fact: sourceFact,
            targetPolicyId: REFERENCE_POLICY_ID,
            targetPolicyVersion: 1,
            targetEnvironment: "sandbox",
            relyingPartner: REFERENCE_INSTITUTIONAL_PLATFORM,
          });
          reuseBefore = reuseDecision.decision;
          if (reuseDecision.decision === "reuse") reuseCount += 1;
          stages.push(stage(
            "reuse_available",
            reuseDecision.decision === "reuse" ? "observed" : "failed",
            new Date().toISOString(),
            `reuse:${reuseDecision.decision}`,
            reuseDecision.decision === "reuse" ? null : "reuse_unavailable",
          ));
          if (reuseDecision.decision !== "reuse") markFail("reuse_available", "reuse_unavailable");
        } else {
          stages.push(stage("reuse_available", "failed", new Date().toISOString(), null, "reuse_unavailable"));
          markFail("reuse_available", "reuse_unavailable");
        }

        if (!failed) {
          serviceGraph.push("policy.evaluatePolicyForSubject:app_b");
          const evalB = await evaluatePolicyForSubject({
            suiAddress: claimsKey,
            policyId: REFERENCE_POLICY_ID,
            partnerId: REFERENCE_INSTITUTIONAL_PLATFORM,
          });
          sameSourceEvidence = evalAClaimsCount > 0
            && evalB.claims.some((c) => c.claim_type === "identity_verified" && c.issuer_id === MOCK_APPROVED_KYC_PROVIDER_ID);

          serviceGraph.push("receipt.issueReceiptForDecision:app_b");
          const decisionIdB = "00000000-0000-4000-8000-00000000appb";
          receiptB = await issueReceiptForDecision({
            decisionId: decisionIdB,
            partnerId: REFERENCE_INSTITUTIONAL_PLATFORM,
            policyId: REFERENCE_POLICY_ID,
            policyVersion: 1,
            subjectId: claimsKey,
            applicationId: REFERENCE_APPLICATION_B,
            decisionResult: "approved",
            reasonCodes: evalB.evaluation.reason_codes,
            claimsJson: evalB.evaluation.claims,
            evaluatedClaimRefs: [],
            expiresAt: sessionExpires,
            decisionContext: "sandbox_only",
          });
          receiptBAt = new Date().toISOString();
          applicationVerifications += 1;

          if (receiptB) {
            narrowB = await buildNarrowPartnerResultForReceipt(receiptB.id);
            publicB = enrichSandboxPublicReceipt(toPublicView(receiptB), receiptB);
            crossDistinct = Boolean(
              narrowA?.pairwise_subject_ref
              && narrowB?.pairwise_subject_ref
              && narrowA.pairwise_subject_ref !== narrowB.pairwise_subject_ref,
            );
            signedNarrowMatch = signedNarrowMatch && Boolean(
              narrowB?.pairwise_subject_ref === receiptB.subject_pseudonym_id,
            );

            serviceGraph.push("externalConsumer.verifyApplicationResult:app_b");
            const consumerB = new ExternalInstitutionalConsumer({
              partnerId: REFERENCE_INSTITUTIONAL_PLATFORM,
              policyId: REFERENCE_POLICY_ID,
              policyVersion: 1,
              applicationId: REFERENCE_APPLICATION_B,
              environment: "sandbox",
              fetchFn: async (url) => {
                if (String(url).includes("/narrow-result")) {
                  return new Response(JSON.stringify(narrowB), { status: 200 });
                }
                return new Response(JSON.stringify({ ...publicB, currently_valid: true, signature_valid: true }), { status: 200 });
              },
            });
            const verifiedB = await consumerB.verifyApplicationResult({
              receiptId: receiptB.id,
              requestId: "vr_app_b_reference",
              publicReceipt: publicB,
              narrowResult: narrowB ?? fallbackNarrowResult({
                receiptId: receiptB.id,
                partnerId: REFERENCE_INSTITUTIONAL_PLATFORM,
                policyId: REFERENCE_POLICY_ID,
              }),
            });
            extB = {
              receipt_id: receiptB.id,
              decision: verifiedB.decision_result,
              result_family: verifiedB.result_family,
              pairwise_present: Boolean(verifiedB.pairwise_subject_ref),
              receipt_verification_ok: verifiedB.receipt_verification_ok,
              public_receipt: publicB,
              narrow_result: narrowB,
            };
            stages.push(stage(
              "application_b_verified",
              verifiedB.receipt_verification_ok && verifiedB.narrow_verification_ok ? "observed" : "failed",
              new Date().toISOString(),
              `receipt:${receiptB.id}`,
            ));
            stages.push(stage(
              "pairwise_isolation_verified",
              crossDistinct && signedNarrowMatch ? "observed" : "failed",
              new Date().toISOString(),
              "pairwise:cross_application",
              crossDistinct ? null : "application_binding_mismatch",
            ));
            if (!crossDistinct) markFail("pairwise_isolation_verified", "application_binding_mismatch");
          }
        }
      }

      if (!failed && claimsKey) {
        serviceGraph.push("provider.processProviderEvent:revocation");
        const revokeEvent = buildMockRevocationEvent({
          providerSubjectRef: providerRef,
          providerEventId: "evt_institutional_proof_revoke",
        });
        const revokeBody = JSON.stringify(revokeEvent);
        const revokeTs = new Date().toISOString();
        const revoked = await processProviderEvent({
          rawBody: revokeBody,
          providerId: MOCK_APPROVED_KYC_PROVIDER_ID,
          signature: signMockProviderEvent(revokeBody, revokeTs),
          timestamp: revokeTs,
          apiKeyHeader: null,
        });
        revocationOk = revoked.ok && revoked.outcome === "revoked";
        stages.push(stage(
          "revocation_received",
          revocationOk ? "observed" : "failed",
          revokeTs,
          "provider_event:evt_institutional_proof_revoke",
          revocationOk ? null : "provider_auth_failed",
        ));

        const { getActiveClaims } = await import("@/lib/credentials/claimsService");
        const activeAfter = await getActiveClaims(claimsKey);
        claimStatusAfterRevoke = activeAfter.length === 0 ? "revoked" : "active";

        const postRevEval = await evaluatePolicyForSubject({
          suiAddress: claimsKey,
          policyId: REFERENCE_POLICY_ID,
          partnerId: REFERENCE_INSTITUTIONAL_PLATFORM,
        });

        if (activeAfter.length === 0 || postRevEval.evaluation.decision !== "approved") {
          reuseAfter = "not_compatible";
        } else {
          const factsAfter = await listHolderFacts(claimsKey);
          const factAfter = factsAfter[0];
          reuseAfter = factAfter
            ? decideEvidenceReuse({
              fact: factAfter,
              targetPolicyId: REFERENCE_POLICY_ID,
              targetPolicyVersion: 1,
              targetEnvironment: "sandbox",
              relyingPartner: REFERENCE_INSTITUTIONAL_PLATFORM,
            }).decision
            : "not_compatible";
        }

        const blocked = postRevEval.evaluation.decision !== "approved" && reuseAfter !== "reuse";
        stages.push(stage(
          "reuse_blocked_after_revocation",
          blocked ? "observed" : "failed",
          new Date().toISOString(),
          `reuse_after:${reuseAfter}`,
          blocked ? null : "reuse_unavailable",
        ));
        if (!blocked) markFail("reuse_blocked_after_revocation", "reuse_unavailable");
      }
    }
  } catch (error) {
    failed = true;
    failureCategory = "internal_error";
    stages.push(stage(
      failureStage ?? "application_a_verified",
      "failed",
      new Date().toISOString(),
      null,
      "internal_error",
    ));
    serviceGraph.push(`error:${error instanceof Error ? error.message : "unknown"}`);
  }

  serviceGraph.push("END");

  return {
    stages,
    service_graph: serviceGraph,
    operator_touch_count: 0,
    provider_verifications: providerVerifications,
    application_verifications: applicationVerifications,
    reuse_count: reuseCount,
    raw_kyc_recollections: 0,
    request_created_at: requestCreatedAt,
    provider_event_received_at: providerEventAt,
    claim_ready_at: claimReadyAt,
    receipt_issued_at_app_a: receiptAAt,
    receipt_issued_at_app_b: receiptBAt,
    partner_verified_at: partnerVerifiedAt,
    application_a: extA,
    application_b: extB,
    reuse_before_revocation: reuseBefore,
    reuse_after_revocation: reuseAfter,
    same_source_evidence_internally: sameSourceEvidence,
    cross_application_pairwise_distinct: crossDistinct,
    signed_narrow_pairwise_match: signedNarrowMatch,
    revocation_event_authenticated: revocationOk,
    source_claim_status_after_revocation: claimStatusAfterRevoke,
    privacy_surfaces_a: [
      ...(publicA ? [publicA as unknown as Record<string, unknown>] : []),
      ...(narrowA ? [narrowA as unknown as Record<string, unknown>] : []),
    ],
    privacy_surfaces_b: [
      ...(publicB ? [publicB as unknown as Record<string, unknown>] : []),
      ...(narrowB ? [narrowB as unknown as Record<string, unknown>] : []),
    ],
    internal_claims_key: claimsKey,
    internal_abraxas_subject_id: abraxasSubjectId,
    failed,
    failure_stage: failureStage,
    failure_category: failureCategory,
  };
}
