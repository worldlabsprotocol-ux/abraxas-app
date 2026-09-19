// FILE: lib/partner/requirePartnerMethodQualification.ts
// Consent and receipt issuance require a server-verified method qualification.

import type { NextRequest } from "next/server";
import {
  qualificationMatchesBinding,
  type MethodQualificationRecord,
} from "@/lib/partner/partnerMethodQualification";
import {
  PARTNER_METHOD_QUALIFICATION_COOKIE,
  verifyPartnerMethodQualificationCookie,
} from "@/lib/partner/partnerMethodQualificationCookie";
import { resolveBoundPartnerContinuation } from "@/lib/partner/resolveBoundPartnerContinuation";

export async function requireQualifiedPartnerMethod(input: {
  request: NextRequest;
  verifyRequestId: string;
  partnerId: string;
  policyId: string;
  policyVersion?: number;
  sessionSubject: string;
}): Promise<{ ok: true; record: MethodQualificationRecord } | { ok: false; code: string }> {
  const verifyRequestId = input.verifyRequestId.trim();
  const bound = await resolveBoundPartnerContinuation({
    request: input.request,
    verifyRequestId,
    sessionSubject: input.sessionSubject,
  });
  if (!bound.ok) return { ok: false, code: bound.code };
  if (bound.stored.partnerId !== input.partnerId.trim() || bound.stored.policyId !== input.policyId.trim()) {
    return { ok: false, code: "cross_partner" };
  }
  const stored = bound.stored;

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
