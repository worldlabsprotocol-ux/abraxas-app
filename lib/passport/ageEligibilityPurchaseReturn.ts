"use client";
// FILE: lib/passport/ageEligibilityPurchaseReturn.ts
// Client helper for explicit L0 purchase return — server builds authoritative redirect.

import { navigateToPartnerHandoffRedirect } from "@/lib/partner/partnerClientNavigation";

export type AgeEligibilityPurchaseReturnResult =
  | { ok: true; redirectUrl: string }
  | { ok: false; code: string; message: string };

export async function postAgeEligibilityPurchaseReturn(input: {
  verificationRequestId: string;
  receiptId: string;
  returnUrl?: string;
}): Promise<AgeEligibilityPurchaseReturnResult> {
  try {
    const res = await fetch("/api/v1/partner-flow/purchase-return", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        verification_request_id: input.verificationRequestId,
        receipt_id: input.receiptId,
        return_url: input.returnUrl,
      }),
    });
    const data = await res.json() as {
      redirect_url?: string;
      code?: string;
      error?: string;
    };
    if (res.ok && data.redirect_url) {
      return { ok: true, redirectUrl: data.redirect_url };
    }
    return {
      ok: false,
      code: data.code ?? "return_failed",
      message: data.error ?? "Return to Good Trouble could not be completed.",
    };
  } catch {
    return {
      ok: false,
      code: "network_failed",
      message: "Connection problem. Check your network and try again.",
    };
  }
}

export function navigateAgeEligibilityPurchaseReturn(redirectUrl: string): boolean {
  return navigateToPartnerHandoffRedirect(redirectUrl);
}
