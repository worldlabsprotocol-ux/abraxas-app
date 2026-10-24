// FILE: lib/partner/authorizePartnerFlowCompleteReturnUrl.ts
// Return URL authorization for partner-flow completion — continuation-bound for hosted vr_*.

import { isReturnUrlAllowed } from "@/lib/connect/returnUrlAllowlist";
import { partnerContinuationReturnUrlsMatch } from "@/lib/partner/continuationReturnUrlMatch";
import {
  continuationIsUsable,
  type PartnerFlowContinuationRecord,
} from "@/lib/partner/partnerFlowContinuation";
import { createSupabaseContinuationStore } from "@/lib/partner/partnerFlowContinuationStore";

export type PartnerFlowReturnUrlAuthorization =
  | { ok: true; authoritativeReturnUrl: string; source: "continuation" | "partner_allowlist" }
  | { ok: false; code: "return_url_rejected" | "cross_partner" | "open_redirect" | "continuation_unavailable" };

function assertContinuationBinding(input: {
  stored: PartnerFlowContinuationRecord;
  partnerId: string;
  returnUrl: string;
}): { ok: true } | { ok: false; code: "cross_partner" | "open_redirect" } {
  if (input.stored.partnerId.trim() !== input.partnerId.trim()) {
    return { ok: false, code: "cross_partner" };
  }
  if (!partnerContinuationReturnUrlsMatch(input.stored.returnUrl, input.returnUrl)) {
    return { ok: false, code: "open_redirect" };
  }
  return { ok: true };
}

/**
 * Authorize the client-supplied return_url for completion.
 * Hosted opaque verify_request flows use the durable continuation return_url
 * (Launchpad-approved at handoff creation), not stale partners.allowed_return_urls rows.
 */
export async function authorizePartnerFlowCompleteReturnUrl(input: {
  partnerId: string;
  returnUrl: string;
  correlationId?: string | null;
}): Promise<PartnerFlowReturnUrlAuthorization> {
  const partnerId = input.partnerId.trim();
  const returnUrl = input.returnUrl.trim();
  const correlationId = input.correlationId?.trim() ?? "";

  if (correlationId) {
    try {
      const stored = await createSupabaseContinuationStore().peekByVerifyRequestId(correlationId);
      if (stored && continuationIsUsable(stored)) {
        const binding = assertContinuationBinding({ stored, partnerId, returnUrl });
        if (!binding.ok) return { ok: false, code: binding.code };
        return {
          ok: true,
          authoritativeReturnUrl: stored.returnUrl,
          source: "continuation",
        };
      }
    } catch {
      return { ok: false, code: "continuation_unavailable" };
    }
  }

  if (await isReturnUrlAllowed(partnerId, returnUrl)) {
    return { ok: true, authoritativeReturnUrl: returnUrl, source: "partner_allowlist" };
  }

  return { ok: false, code: "return_url_rejected" };
}
