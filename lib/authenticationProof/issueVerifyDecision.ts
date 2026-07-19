// FILE: lib/authenticationProof/issueVerifyDecision.ts
// Issue authentication proof + decision receipt for POST /api/credentials/verify.

import type { DecisionReceiptPublicView } from "@/lib/decisionReceipts/types";
import { issueReceiptForDecision } from "@/lib/decisionReceipts/service";
import { toPublicView } from "@/lib/decisionReceipts/views";
import type { PartnerVerifyResponse } from "@/lib/partner/partnerDecision";
import { issueAuthenticationProof } from "./issue";
import { parsePolicyVersionNumber } from "./policyVersion";
import type { IssuedAuthenticationProof } from "./types";

export type VerifyDecisionMode = "credential_jwt" | "registry" | "policy_check";

export interface VerifyDecisionArtifacts {
  proof_id: string;
  verify_url: string;
  authentication_proof: IssuedAuthenticationProof;
  decision_receipt: DecisionReceiptPublicView | null;
}

function mapDecisionResult(
  decision: PartnerVerifyResponse["decision"],
): "approved" | "denied" | "manual_review" {
  if (decision === "approved" || decision === "denied" || decision === "manual_review") {
    return decision;
  }
  return "denied";
}

function reasonCodesFromResponse(response: PartnerVerifyResponse): string[] {
  const codes: string[] = [];
  if (response.error) codes.push(response.error);
  if (response.status === "revoked") codes.push("record_revoked");
  if (response.status === "expired") codes.push("record_expired");
  if (response.status === "not_found") codes.push("record_not_found");
  if (!codes.length) {
    codes.push(response.decision === "approved" ? "policy_approved" : "policy_denied");
  }
  return codes;
}

function subjectIdForReceipt(response: PartnerVerifyResponse, partnerId: string): string {
  return (
    response.sui_address ??
    response.holder_address ??
    response.record_id ??
    `${partnerId}:${response.decision_reference}`
  );
}

export async function issueVerifyDecisionArtifacts(input: {
  partnerId: string;
  response: PartnerVerifyResponse;
  mode: VerifyDecisionMode;
  suiAddress?: string;
}): Promise<VerifyDecisionArtifacts> {
  const { partnerId, response, mode } = input;
  const decisionId = response.decision_reference;
  const policyVersion = parsePolicyVersionNumber(response.policy_version);

  const recordPayload = {
    decision_id: decisionId,
    partner_id: partnerId,
    mode,
    decision: response.decision,
    status: response.status,
    policy_id: response.policy_id,
    policy_version: response.policy_version,
    record_id: response.record_id ?? null,
    record_type: response.record_type ?? null,
    assurance_level: response.assurance_level,
    sui_address: input.suiAddress ?? response.sui_address ?? null,
    credential_jti: response.credential_jti ?? null,
    evaluated_at: new Date().toISOString(),
  };

  const authentication_proof = await issueAuthenticationProof({
    eventType: "credential_verify",
    recordId: decisionId,
    assetAbxId: response.record_id?.startsWith("ABX-") ? response.record_id : null,
    recordPayload,
  });

  let decision_receipt: DecisionReceiptPublicView | null = null;

  const receiptRecord = await issueReceiptForDecision({
    decisionId,
    partnerId,
    policyId: response.policy_id,
    policyVersion,
    subjectId: subjectIdForReceipt(response, partnerId),
    decisionResult: mapDecisionResult(response.decision),
    reasonCodes: reasonCodesFromResponse(response),
    claimsJson: {},
    evaluatedClaimRefs: [],
    expiresAt: response.valid_until,
    decisionContext: "production",
    anchorReference: authentication_proof.proof_id,
  });

  if (receiptRecord) {
    decision_receipt = toPublicView(receiptRecord);
  }

  return {
    proof_id: authentication_proof.proof_id,
    verify_url: authentication_proof.verify_url,
    authentication_proof,
    decision_receipt,
  };
}
