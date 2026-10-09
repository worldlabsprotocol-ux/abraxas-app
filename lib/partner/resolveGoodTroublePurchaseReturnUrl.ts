// FILE: lib/partner/resolveGoodTroublePurchaseReturnUrl.ts
// Authoritative Good Trouble purchase callback URL with gtv for Abraxas return handoff.

import {
  coalesceGoodTroublePurchaseReturnUrl,
  extractGoodTroubleFlowToken,
  mergePartnerReturnUrlHints,
  preferAuthoritativeContinuationReturnUrl,
} from "@/lib/partner/continuationReturnUrlMatch";
import type { PartnerFlowContinuationRecord } from "@/lib/partner/partnerFlowContinuation";
import { createSupabaseContinuationStore } from "@/lib/partner/partnerFlowContinuationStore";
import { upgradeStoredContinuationWithPartnerHint } from "@/lib/partner/partnerReturnUrlHint";

export type ResolveGoodTroublePurchaseReturnUrlResult = {
  redirectBase: string;
  storedUpgraded: boolean;
  hasGtv: boolean;
};

export async function resolveAndPersistGoodTroublePurchaseReturnUrl(input: {
  stored: PartnerFlowContinuationRecord;
  hints: (string | null | undefined)[];
}): Promise<ResolveGoodTroublePurchaseReturnUrlResult> {
  const mergedHint = mergePartnerReturnUrlHints(...input.hints);
  let stored = input.stored;
  let storedUpgraded = false;

  if (mergedHint) {
    const upgraded = await upgradeStoredContinuationWithPartnerHint({
      stored,
      partnerHint: mergedHint,
    });
    if (upgraded.returnUrl !== stored.returnUrl) {
      storedUpgraded = true;
      stored = upgraded;
    }
  }

  const coalesced = mergedHint
    ? coalesceGoodTroublePurchaseReturnUrl(stored.returnUrl, mergedHint)
    : stored.returnUrl;
  const redirectBase = preferAuthoritativeContinuationReturnUrl(stored.returnUrl, coalesced);
  const hasGtv = Boolean(extractGoodTroubleFlowToken(redirectBase));

  if (redirectBase !== stored.returnUrl && hasGtv) {
    await createSupabaseContinuationStore().save({ ...stored, returnUrl: redirectBase });
    storedUpgraded = true;
  }

  return { redirectBase, storedUpgraded, hasGtv };
}
