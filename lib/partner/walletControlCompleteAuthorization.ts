// Authoritative gates before wallet-control partner-flow completion.

import type { NextRequest } from "next/server";
import { isWalletControlPartnerPolicy } from "@/lib/partner/walletControlPartnerPolicy";
import { requireQualifiedPartnerMethod } from "@/lib/partner/requirePartnerMethodQualification";
import { requirePartnerSharingConsent } from "@/lib/partner/requirePartnerSharingConsent";

export function walletControlCompleteRequiresAuthorization(input: {
  policyId: string;
  verifyRequestId: string | null;
}): boolean {
  if (!input.verifyRequestId?.trim()) return false;
  return isWalletControlPartnerPolicy(input.policyId);
}

export async function enforceWalletControlCompleteAuthorization(input: {
  request: NextRequest;
  partnerId: string;
  policyId: string;
  verifyRequestId: string;
  sessionSubject: string;
  policyVersion?: number;
}): Promise<
  | { ok: true }
  | { ok: false; httpStatus: number; code: string; error: string }
> {
  const qualified = await requireQualifiedPartnerMethod({
    request: input.request,
    verifyRequestId: input.verifyRequestId,
    partnerId: input.partnerId,
    policyId: input.policyId,
    policyVersion: input.policyVersion,
    sessionSubject: input.sessionSubject,
  });
  if (!qualified.ok) {
    return {
      ok: false,
      httpStatus: 403,
      code: qualified.code,
      error: "Wallet control must be qualified for this request before completion.",
    };
  }

  const sharing = await requirePartnerSharingConsent({
    request: input.request,
    verifyRequestId: input.verifyRequestId,
    partnerId: input.partnerId,
    policyId: input.policyId,
    policyVersion: qualified.record.policyVersion ?? input.policyVersion,
  });
  if (!sharing.ok) {
    return {
      ok: false,
      httpStatus: 403,
      code: sharing.code,
      error: "Explicit holder consent is required before sharing the result.",
    };
  }

  return { ok: true };
}
