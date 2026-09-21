// FILE: lib/eligibilityPresentation/complete.ts
// Server-only bind of a completed Hosted Partner Flow receipt to a presentation request.

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { holderSessionHmac, partnerHmac } from "./opaque";
import { loadPresentationRequest, savePresentationRequest, findUniqueCreatedRequest } from "./store";
import { loadSourceReceipt, receiptEnvironment, receiptHasFreshConsent } from "./sourceReceipt";

function fail(code: string): never {
  throw Object.assign(new Error(code), { code });
}

export function assertReceiptMatchesRequest(
  request: {
    partner_hmac: string;
    policy_id: string;
    policy_version: number;
    environment: "sandbox" | "production";
    holder_session_hmac: string | null;
  },
  receipt: DecisionReceiptRecord,
  partnerId?: string,
): void {
  if (partnerId && partnerHmac(partnerId) !== request.partner_hmac) fail("cross_partner");
  if (partnerId && receipt.partner_id !== partnerId) fail("cross_partner");
  if (partnerHmac(receipt.partner_id) !== request.partner_hmac) fail("cross_partner");
  if (receipt.policy_id !== request.policy_id || receipt.policy_version !== request.policy_version) {
    fail("policy_mismatch");
  }
  if (receiptEnvironment(receipt) !== request.environment) fail("environment_mismatch");
  if (!receiptHasFreshConsent(receipt)) fail("consent_required");
  if (receipt.status !== "active" || receipt.decision_result !== "approved" || receipt.revoked_at) {
    fail("receipt_invalid");
  }
  if (request.holder_session_hmac && request.holder_session_hmac !== holderSessionHmac(receipt.subject_pseudonym_id)) {
    fail("holder_mismatch");
  }
}

export async function completePresentationHolderResult(input: {
  requestRef: string;
  receipt: DecisionReceiptRecord;
  partnerId?: string;
}): Promise<void> {
  const request = await loadPresentationRequest(input.requestRef);
  if (!request) fail("no_completed_result");
  if (request.status === "issued" || request.status === "consumed") fail("replayed");
  if (request.status !== "created") fail(request.status);
  assertReceiptMatchesRequest(request, input.receipt, input.partnerId);
  await savePresentationRequest({
    ...request,
    status: "completed",
    source_receipt_id: input.receipt.id,
    holder_session_hmac: holderSessionHmac(input.receipt.subject_pseudonym_id),
    consent_bound: true,
  });
}

export async function bindPresentationResultToIssuedReceipt(input: {
  partnerId: string;
  policyId: string;
  policyVersion: number;
  receipt: DecisionReceiptRecord;
}): Promise<void> {
  const environment = receiptEnvironment(input.receipt);
  const request = await findUniqueCreatedRequest({
    partnerHmac: partnerHmac(input.partnerId),
    policyId: input.policyId,
    policyVersion: input.policyVersion,
    environment,
  });
  if (!request) return;
  await completePresentationHolderResult({
    requestRef: request.request_ref,
    receipt: input.receipt,
    partnerId: input.partnerId,
  });
}

export async function completePresentationHolderResultForTests(input: {
  requestRef: string;
  receipt: DecisionReceiptRecord;
  partnerId?: string;
}): Promise<void> {
  await completePresentationHolderResult(input);
}

export async function loadBoundSourceReceipt(request: {
  source_receipt_id: string | null;
}): Promise<DecisionReceiptRecord> {
  if (!request.source_receipt_id) fail("no_completed_result");
  const receipt = await loadSourceReceipt(request.source_receipt_id);
  if (!receipt) fail("no_completed_result");
  return receipt;
}
