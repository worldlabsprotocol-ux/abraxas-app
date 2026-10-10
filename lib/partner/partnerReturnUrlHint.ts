// FILE: lib/partner/partnerReturnUrlHint.ts
// Server-side partner return_url hints (resume cookie) for hosted Good Trouble purchase return.

import type { NextRequest } from "next/server";
import {
  coalesceGoodTroubleBrowseReturnUrl,
  coalesceGoodTroublePurchaseReturnUrl,
  goodTroubleBrowseReturnUrlBindingAllowed,
  goodTroublePurchaseReturnUrlBindingAllowed,
  preferAuthoritativeContinuationReturnUrl,
  mergePartnerReturnUrlHints,
} from "@/lib/partner/continuationReturnUrlMatch";
import {
  continuationIsUsable,
  type PartnerFlowContinuationRecord,
} from "@/lib/partner/partnerFlowContinuation";
import { createSupabaseContinuationStore } from "@/lib/partner/partnerFlowContinuationStore";
import {
  PARTNER_VERIFY_RESUME_COOKIE,
  verifyPartnerVerifyResumeCookie,
} from "@/lib/partner/partnerVerifyResumeCookie";
import { readGoodTroubleGtbBindingReturnUrl } from "@/lib/partner/goodTroubleGtbBindingCookie";
import { readGoodTroubleGtvBindingReturnUrl } from "@/lib/partner/goodTroubleGtvBindingCookie";

export { mergePartnerReturnUrlHints };

export async function readPartnerVerifyResumeReturnUrl(
  request: NextRequest,
): Promise<string | null> {
  const token = request.cookies.get(PARTNER_VERIFY_RESUME_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyPartnerVerifyResumeCookie(token);
  if (!payload?.jti) return null;

  try {
    const stored = await createSupabaseContinuationStore().peek(payload.jti);
    if (!continuationIsUsable(stored)) return null;
    const returnUrl = stored.returnUrl.trim();
    return returnUrl || null;
  } catch {
    return null;
  }
}

export async function resolvePartnerReturnUrlHintForRequest(
  request: NextRequest,
  clientHint?: string | null,
  verifyRequestId?: string | null,
): Promise<string> {
  const resumeReturnUrl = await readPartnerVerifyResumeReturnUrl(request);
  const gtvBindingReturnUrl = verifyRequestId
    ? await readGoodTroubleGtvBindingReturnUrl(request, verifyRequestId)
    : null;
  const gtbBindingReturnUrl = verifyRequestId
    ? await readGoodTroubleGtbBindingReturnUrl(request, verifyRequestId)
    : null;
  return mergePartnerReturnUrlHints(
    clientHint,
    resumeReturnUrl,
    gtvBindingReturnUrl,
    gtbBindingReturnUrl,
  );
}

export async function upgradeStoredContinuationWithPartnerHint(input: {
  stored: PartnerFlowContinuationRecord;
  partnerHint: string;
}): Promise<PartnerFlowContinuationRecord> {
  const hint = input.partnerHint.trim();
  if (!hint || !continuationIsUsable(input.stored) || input.stored.consumedAt) {
    return input.stored;
  }
  const purchaseAllowed = goodTroublePurchaseReturnUrlBindingAllowed(input.stored.returnUrl, hint);
  const browseAllowed = goodTroubleBrowseReturnUrlBindingAllowed(input.stored.returnUrl, hint);
  if (!purchaseAllowed && !browseAllowed) {
    return input.stored;
  }
  let coalesced = input.stored.returnUrl;
  if (purchaseAllowed) {
    coalesced = coalesceGoodTroublePurchaseReturnUrl(coalesced, hint);
  }
  if (browseAllowed) {
    coalesced = coalesceGoodTroubleBrowseReturnUrl(coalesced, hint);
  }
  const resolved = preferAuthoritativeContinuationReturnUrl(input.stored.returnUrl, coalesced);
  if (resolved === input.stored.returnUrl) return input.stored;

  const upgraded = { ...input.stored, returnUrl: resolved };
  await createSupabaseContinuationStore().save(upgraded);
  return upgraded;
}
