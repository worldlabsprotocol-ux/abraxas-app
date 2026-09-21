// FILE: lib/eligibilityPresentation/issue.ts

import { randomBytes } from "node:crypto";
import {
  ELIGIBILITY_PRESENTATION_ISSUER,
  ELIGIBILITY_PRESENTATION_MEDIA_TYPE,
  ELIGIBILITY_PRESENTATION_VERSION,
} from "./contract";
import { opaquePresentationRef, partnerHmac } from "./opaque";
import { loadPresentationRequest, savePresentation, savePresentationRequest } from "./store";
import { loadSourceReceipt, receiptHasFreshConsent } from "./sourceReceipt";
import { signPresentationPayload } from "./sign";
import type { EligibilityPresentationEnvelope, EligibilityPresentationPayload } from "./types";

export const ISSUE_REQUEST_KEYS = ["request_ref", "receipt_id"] as const;

export async function issueEligibilityPresentation(input: {
  partnerId: string;
  request_ref: string;
  receipt_id: string;
  verifier_nonce: string;
}): Promise<EligibilityPresentationEnvelope> {
  const request = await loadPresentationRequest(input.request_ref);
  if (!request) throw Object.assign(new Error("not_found"), { code: "not_found" });
  if (request.partner_hmac !== partnerHmac(input.partnerId)) {
    throw Object.assign(new Error("cross_partner"), { code: "cross_partner" });
  }
  if (request.status !== "created") {
    throw Object.assign(new Error(request.status), { code: request.status });
  }
  if (new Date(request.expires_at).getTime() <= Date.now()) {
    throw Object.assign(new Error("expired"), { code: "expired" });
  }
  const receipt = await loadSourceReceipt(input.receipt_id);
  if (!receipt) throw Object.assign(new Error("receipt_not_found"), { code: "receipt_not_found" });
  if (receipt.partner_id !== input.partnerId) {
    throw Object.assign(new Error("cross_partner"), { code: "cross_partner" });
  }
  if (receipt.policy_id !== request.policy_id || receipt.policy_version !== request.policy_version) {
    throw Object.assign(new Error("policy_mismatch"), { code: "policy_mismatch" });
  }
  const receiptEnv = receipt.decision_context === "production" ? "production" : "sandbox";
  if (receiptEnv !== request.environment) {
    throw Object.assign(new Error("environment_mismatch"), { code: "environment_mismatch" });
  }
  if (!receiptHasFreshConsent(receipt)) {
    throw Object.assign(new Error("consent_required"), { code: "consent_required" });
  }
  if (receipt.status !== "active" || receipt.decision_result !== "approved" || receipt.revoked_at) {
    throw Object.assign(new Error("receipt_invalid"), { code: "receipt_invalid" });
  }

  const presentation_ref = opaquePresentationRef(`${request.request_ref}:${randomBytes(8).toString("hex")}`);
  const issued_at = new Date().toISOString();
  const payload: EligibilityPresentationPayload = {
    schema_version: ELIGIBILITY_PRESENTATION_VERSION,
    presentation_ref,
    issuer: ELIGIBILITY_PRESENTATION_ISSUER,
    audience_hash: request.audience_hash,
    policy_id: request.policy_id,
    policy_version: request.policy_version,
    result_category: request.result_category,
    currently_valid: true,
    environment: request.environment,
    issued_at,
    expires_at: request.expires_at,
    verifier_nonce: input.verifier_nonce,
    signing_key_id: "",
    receipt_verification_ref: receipt.id,
    selective_disclosure_summary: "result_only",
  };
  const signed = signPresentationPayload({ ...payload, signing_key_id: "pending" });
  if (!signed) throw Object.assign(new Error("signing_unavailable"), { code: "signing_unavailable" });
  payload.signing_key_id = signed.signingKeyId;
  const resigned = signPresentationPayload(payload);
  if (!resigned) throw Object.assign(new Error("signing_unavailable"), { code: "signing_unavailable" });

  await savePresentation({
    presentation_ref,
    request_ref: request.request_ref,
    partner_hmac: request.partner_hmac,
    audience_hash: request.audience_hash,
    policy_id: request.policy_id,
    policy_version: request.policy_version,
    action: request.action,
    action_scope: request.action_scope,
    environment: request.environment,
    result_category: request.result_category,
    nonce_hash: request.nonce_hash,
    receipt_verification_ref: receipt.id,
    signing_key_id: resigned.signingKeyId,
    payload_hash: resigned.payloadHash,
    signature: resigned.signature,
    status: "issued",
    issued_at,
    expires_at: request.expires_at,
    consumed_at: null,
    revoked_at: null,
    consent_bound: true,
  });
  await savePresentationRequest({
    ...request,
    status: "issued",
    presentation_ref,
    source_receipt_id: receipt.id,
    consent_bound: true,
  });

  return {
    media_type: ELIGIBILITY_PRESENTATION_MEDIA_TYPE,
    payload,
    signature: resigned.signature,
  };
}
