// FILE: lib/partner/bindPartnerFlowContinuationForEvaluate.ts
// Bind server-authoritative return_url to evaluate-created verification requests.

import type { NextRequest } from "next/server";
import {
  assertContinuationMatchesStored,
  continuationIsUsable,
  createPartnerFlowContinuationRecord,
  ContinuationStoreUnavailableError,
} from "@/lib/partner/partnerFlowContinuation";
import { createSupabaseContinuationStore } from "@/lib/partner/partnerFlowContinuationStore";
import {
  PARTNER_VERIFY_RESUME_COOKIE,
  verifyPartnerVerifyResumeCookie,
} from "@/lib/partner/partnerVerifyResumeCookie";

export type BindEvaluateContinuationResult =
  | { ok: true; verifyRequestId: string }
  | { ok: false; code: string };

/**
 * Ensures partner_flow_continuations has a row keyed by verify_request_id for
 * evaluate-created flows (Wix direct entry, hosted bootstrap). Without this,
 * method qualification, consent, and return handoff cannot resolve return_url.
 */
export async function bindPartnerFlowContinuationForEvaluate(input: {
  request: NextRequest;
  verifyRequestId: string;
  partnerId: string;
  policyId: string;
  returnUrl: string;
  purpose?: string;
  policyVersion?: number;
  appSlug?: string;
}): Promise<BindEvaluateContinuationResult> {
  const verifyRequestId = input.verifyRequestId.trim();
  const partnerId = input.partnerId.trim();
  const policyId = input.policyId.trim();
  const returnUrl = input.returnUrl.trim();

  if (!verifyRequestId || !partnerId || !policyId || !returnUrl) {
    return { ok: false, code: "missing" };
  }

  const store = createSupabaseContinuationStore();

  try {
    const existing = await store.peekByVerifyRequestId(verifyRequestId);
    if (continuationIsUsable(existing)) {
      const matched = assertContinuationMatchesStored({
        stored: existing,
        partnerId,
        policyId,
        returnUrl,
        policyVersion: input.policyVersion,
      });
      if (matched.ok) {
        return { ok: true, verifyRequestId };
      }
    }

    const resumeToken = input.request.cookies.get(PARTNER_VERIFY_RESUME_COOKIE)?.value;
    const resume = resumeToken ? await verifyPartnerVerifyResumeCookie(resumeToken) : null;
    if (resume?.jti) {
      const stored = await store.peek(resume.jti);
      if (continuationIsUsable(stored)) {
        const matched = assertContinuationMatchesStored({
          stored,
          partnerId,
          policyId,
          returnUrl,
          policyVersion: input.policyVersion,
        });
        if (matched.ok) {
          await store.attachVerifyRequestId(resume.jti, verifyRequestId);
          return { ok: true, verifyRequestId };
        }
      }
    }

    const record = createPartnerFlowContinuationRecord({
      partnerId,
      policyId,
      returnUrl,
      purpose: input.purpose,
      appSlug: input.appSlug,
      policyVersion: input.policyVersion,
    });
    if (!record) {
      return { ok: false, code: "invalid_continuation" };
    }

    await store.save({ ...record, verifyRequestId });
    return { ok: true, verifyRequestId };
  } catch (error) {
    if (error instanceof ContinuationStoreUnavailableError) {
      return { ok: false, code: error.code };
    }
    throw error;
  }
}
