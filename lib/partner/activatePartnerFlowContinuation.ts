// FILE: lib/partner/activatePartnerFlowContinuation.ts
// Activate a stored continuation after sign-in. Creates a pending VR only — never a receipt.

import { isAllowedPartnerReturnUrl } from "@/lib/partner/returnUrlAllowlist";
import {
  assertContinuationMatchesStored,
  buildPartnerContinuePath,
  continuationIsUsable,
  sanitizePartnerFlowContinuation,
  type PartnerFlowContinuationRecord,
  type PartnerFlowContinuationStore,
} from "@/lib/partner/partnerFlowContinuation";
import { createVerificationRequest } from "@/lib/verification/requestsService";

export type ActivateContinuationResult =
  | {
    ok: true;
    continuePath: string;
    verifyRequestId: string;
    partnerId: string;
    policyId: string;
    purpose?: string;
    returnUrl: string;
    issuedReceipt: false;
  }
  | { ok: false; code: string };

export async function activatePartnerFlowContinuation(input: {
  store: PartnerFlowContinuationStore;
  jti: string | null;
  suiAddress?: string;
  claimedPartnerId?: string;
  claimedPolicyId?: string;
  claimedPolicyVersion?: number;
  claimedReturnUrl?: string;
  allowReturnUrl?: (partnerId: string, returnUrl: string) => Promise<boolean>;
}): Promise<ActivateContinuationResult> {
  if (!input.jti) return { ok: false, code: "missing" };

  const peeked = await input.store.peek(input.jti);
  if (!peeked) return { ok: false, code: "missing" };
  if (peeked.consumedAt) return { ok: false, code: "replay" };
  if (!continuationIsUsable(peeked)) return { ok: false, code: "expired" };

  const match = assertContinuationMatchesStored({
    stored: peeked,
    partnerId: input.claimedPartnerId,
    policyId: input.claimedPolicyId,
    policyVersion: input.claimedPolicyVersion,
    returnUrl: input.claimedReturnUrl,
  });
  if (!match.ok) return match;

  const sanitized = sanitizePartnerFlowContinuation(peeked);
  if (!sanitized) return { ok: false, code: "invalid_continuation" };

  const allow = input.allowReturnUrl ?? isAllowedPartnerReturnUrl;
  if (!await allow(sanitized.partnerId, sanitized.returnUrl)) {
    return { ok: false, code: "open_redirect" };
  }

  const consumed = await input.store.consume(input.jti);
  if (!consumed) return { ok: false, code: "replay" };

  try {
    const request = await createVerificationRequest({
      partnerId: sanitized.partnerId,
      policyId: sanitized.policyId,
      purpose: sanitized.purpose,
      suiAddress: input.suiAddress,
      returnUrl: sanitized.returnUrl,
      expectedPolicyVersion: sanitized.policyVersion,
    });

    const continuePath = buildPartnerContinuePath({
      verificationRequestId: request.request_id,
      partnerId: sanitized.partnerId,
      policyId: sanitized.policyId,
      purpose: sanitized.purpose,
    });
    if (!continuePath) return { ok: false, code: "invalid_continue_path" };

    return {
      ok: true,
      continuePath,
      verifyRequestId: request.request_id,
      partnerId: sanitized.partnerId,
      policyId: sanitized.policyId,
      purpose: sanitized.purpose,
      returnUrl: sanitized.returnUrl,
      issuedReceipt: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("policy_version") || message.includes("Policy")) {
      return { ok: false, code: "altered_version" };
    }
    if (message.toLowerCase().includes("belong")) {
      return { ok: false, code: "cross_partner" };
    }
    return { ok: false, code: "activate_failed" };
  }
}

export function peekContinuationSafeView(record: PartnerFlowContinuationRecord | null): {
  hasContinuation: boolean;
  action: "return_to_partner_verification" | null;
} {
  if (!continuationIsUsable(record)) {
    return { hasContinuation: false, action: null };
  }
  return { hasContinuation: true, action: "return_to_partner_verification" };
}
