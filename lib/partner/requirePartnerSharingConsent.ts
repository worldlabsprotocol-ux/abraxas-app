// Explicit sharing consent — separate from wallet-control method qualification.

import type { NextRequest } from "next/server";
import {
  PARTNER_SHARING_CONSENT_COOKIE,
  sharingConsentMatchesBinding,
  verifyPartnerSharingConsentCookie,
} from "@/lib/partner/partnerSharingConsentCookie";

export async function requirePartnerSharingConsent(input: {
  request: NextRequest;
  verifyRequestId: string;
  partnerId: string;
  policyId: string;
  policyVersion?: number;
  sessionSubject: string;
}): Promise<{ ok: true } | { ok: false; code: string }> {
  const token = input.request.cookies.get(PARTNER_SHARING_CONSENT_COOKIE)?.value;
  const record = token ? await verifyPartnerSharingConsentCookie(token) : null;
  if (!sharingConsentMatchesBinding({
    record,
    verifyRequestId: input.verifyRequestId,
    partnerId: input.partnerId,
    policyId: input.policyId,
    policyVersion: input.policyVersion,
    sessionSubject: input.sessionSubject,
  })) {
    return { ok: false, code: "sharing_consent_required" };
  }
  return { ok: true };
}
