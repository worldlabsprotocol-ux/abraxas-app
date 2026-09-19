// FILE: lib/partner/requirePartnerMethodQualification.ts
// Consent and receipt issuance require a server-verified method qualification.

import type { NextRequest } from "next/server";
import { createSupabaseContinuationStore } from "@/lib/partner/partnerFlowContinuationStore";
import {
  qualificationMatchesBinding,
  type MethodQualificationRecord,
} from "@/lib/partner/partnerMethodQualification";
import {
  PARTNER_METHOD_QUALIFICATION_COOKIE,
  verifyPartnerMethodQualificationCookie,
} from "@/lib/partner/partnerMethodQualificationCookie";
import {
  PARTNER_CONTINUE_BINDING_COOKIE,
  verifyPartnerContinueBindingCookie,
} from "@/lib/partner/partnerVerifyResumeCookie";

export async function requireQualifiedPartnerMethod(input: {
  request: NextRequest;
  verifyRequestId: string;
  partnerId: string;
  policyId: string;
  policyVersion?: number;
}): Promise<{ ok: true; record: MethodQualificationRecord } | { ok: false; code: string }> {
  const verifyRequestId = input.verifyRequestId.trim();
  const bindingTok = input.request.cookies.get(PARTNER_CONTINUE_BINDING_COOKIE)?.value;
  const pointer = bindingTok ? await verifyPartnerContinueBindingCookie(bindingTok) : null;
  if (!pointer || pointer.verifyRequestId !== verifyRequestId) {
    return { ok: false, code: "invalid_binding" };
  }

  let stored;
  try {
    stored = await createSupabaseContinuationStore().peekByVerifyRequestId(verifyRequestId);
  } catch {
    return { ok: false, code: "continuation_store_unavailable" };
  }
  if (!stored) return { ok: false, code: "missing" };
  if (stored.partnerId !== input.partnerId.trim() || stored.policyId !== input.policyId.trim()) {
    return { ok: false, code: "cross_partner" };
  }

  const qTok = input.request.cookies.get(PARTNER_METHOD_QUALIFICATION_COOKIE)?.value;
  const record = qTok ? await verifyPartnerMethodQualificationCookie(qTok) : null;
  if (!qualificationMatchesBinding({
    record,
    verifyRequestId,
    partnerId: stored.partnerId,
    policyId: stored.policyId,
    policyVersion: stored.policyVersion ?? input.policyVersion,
  })) {
    return { ok: false, code: "method_not_qualified" };
  }
  return { ok: true, record: record! };
}
