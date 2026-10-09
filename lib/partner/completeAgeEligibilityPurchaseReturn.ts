// FILE: lib/partner/completeAgeEligibilityPurchaseReturn.ts
// L0 age-eligibility purchase return — authoritative continuation + consent receipt.
//
// Missouri compliance boundary: DOB-only L0 is a narrow 21+ eligibility result, not
// government-ID verification or a dispensary point-of-sale ID replacement.

import { normalizeSuiAddress } from "@mysten/sui/utils";
import { buildRedirectUrl, isReturnUrlAllowed } from "@/lib/connect/returnUrlAllowlist";
import { getReceiptById } from "@/lib/decisionReceipts/service";
import {
  continuationIsUsable,
  type PartnerFlowContinuationRecord,
} from "@/lib/partner/partnerFlowContinuation";
import { createSupabaseContinuationStore } from "@/lib/partner/partnerFlowContinuationStore";
import {
  extractGoodTroubleFlowToken,
  goodTroublePurchaseReturnUrlBindingAllowed,
  isGoodTroublePurchaseCallbackPath,
} from "@/lib/partner/continuationReturnUrlMatch";
import { isCanonicalGoodTroublePurchaseFlow } from "@/lib/partner/goodTroublePurchaseFlow";
import {
  findReceiptForOpaqueVerifyRequest,
  findReceiptForVerificationRequest,
} from "@/lib/partner/sessionDecision";
import { isAgeEligibilityOnlyPolicy } from "@/lib/policy/selfAttestationGuards";
import { getPolicy } from "@/lib/verification/requestsService";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { isOpaqueVerifyRequest } from "@/lib/partner/partnerFlowContinuationIdentifiers";
import { bindHandoffToIssuedReceipt, loadHandoffByVerifyRequest } from "@/lib/partner/hostedHandoff/store";
import {
  buildPurchaseReturnDiagnostic,
  logGoodTroublePurchaseReturnDiagnostic,
} from "@/lib/partner/goodTroublePurchaseReturnDiagnostics";
import { resolveAndPersistGoodTroublePurchaseReturnUrl } from "@/lib/partner/resolveGoodTroublePurchaseReturnUrl";

export type AgeEligibilityPurchaseReturnResult =
  | {
    ok: true;
    redirect_url: string;
    receipt_id: string;
    decision_id: string;
    replay: boolean;
  }
  | { ok: false; error: string; code: string };

async function loadDecidedVerificationRequest(input: {
  verificationRequestId: string;
  sessionSubject: string;
}): Promise<
  | {
    ok: true;
    partnerId: string;
    policyId: string;
    purpose: string | null;
  }
  | { ok: false; code: string }
> {
  const sb = requireSupabaseAdmin();
  const subject = normalizeSuiAddress(input.sessionSubject);
  const { data, error } = await sb
    .from("verification_requests")
    .select("partner_id, policy_id, purpose, status, sui_address, subject_id")
    .eq("id", input.verificationRequestId)
    .maybeSingle();

  if (error) return { ok: false, code: "store_unavailable" };
  if (!data) return { ok: false, code: "missing" };

  const status = String(data.status ?? "");
  if (status !== "decided") return { ok: false, code: "not_decided" };

  const boundSubject = String(data.sui_address ?? data.subject_id ?? "").trim();
  if (boundSubject) {
    try {
      if (normalizeSuiAddress(boundSubject) !== subject) {
        return { ok: false, code: "invalid_session" };
      }
    } catch {
      return { ok: false, code: "invalid_session" };
    }
  }

  return {
    ok: true,
    partnerId: String(data.partner_id ?? ""),
    policyId: String(data.policy_id ?? ""),
    purpose: typeof data.purpose === "string" ? data.purpose : null,
  };
}

function assertPurchaseReturnContinuation(input: {
  stored: PartnerFlowContinuationRecord;
  partnerId: string;
  policyId: string;
  clientReturnUrl?: string;
}): { ok: true } | { ok: false; code: string } {
  if (input.stored.partnerId.trim() !== input.partnerId.trim()) {
    return { ok: false, code: "cross_partner" };
  }
  if (input.stored.policyId.trim() !== input.policyId.trim()) {
    return { ok: false, code: "altered_policy" };
  }
  if (
    input.clientReturnUrl
    && !goodTroublePurchaseReturnUrlBindingAllowed(input.stored.returnUrl, input.clientReturnUrl)
  ) {
    return { ok: false, code: "open_redirect" };
  }

  const parsed = new URL(input.stored.returnUrl);
  if (!isGoodTroublePurchaseCallbackPath(parsed.pathname)) {
    return { ok: false, code: "altered_path" };
  }

  return { ok: true };
}

/**
 * Build the authoritative Good Trouble purchase callback after consent.
 * Uses stored continuation return_url (preserves gtv/PKCE state); never client return_url.
 */
async function resolvePurchaseReturnBinding(input: {
  verificationRequestId: string;
  sessionSubject: string;
}): Promise<
  | {
    ok: true;
    partnerId: string;
    policyId: string;
    purpose: string | null;
  }
  | { ok: false; code: string }
> {
  if (isOpaqueVerifyRequest(input.verificationRequestId)) {
    const handoff = await loadHandoffByVerifyRequest(input.verificationRequestId);
    if (!handoff) return { ok: false, code: "missing" };
    if (handoff.status !== "completed" && handoff.status !== "consumed") {
      const issued = await findReceiptForOpaqueVerifyRequest({
        verifyRequestId: input.verificationRequestId,
        subjectId: input.sessionSubject,
      });
      if (!issued) return { ok: false, code: "not_decided" };
      await bindHandoffToIssuedReceipt({
        verifyRequest: input.verificationRequestId,
        partnerId: handoff.partner_id,
        policyId: handoff.policy_id,
        publicReceiptId: issued.receipt_id,
        bindingId: handoff.binding_id,
      });
    }
    if (handoff.partner_id.trim().length === 0 || handoff.policy_id.trim().length === 0) {
      return { ok: false, code: "missing" };
    }
    return {
      ok: true,
      partnerId: handoff.partner_id,
      policyId: handoff.policy_id,
      purpose: handoff.purpose,
    };
  }
  return loadDecidedVerificationRequest(input);
}

export async function completeAgeEligibilityPurchaseReturn(input: {
  suiAddress: string;
  verificationRequestId: string;
  receiptId?: string;
  clientReturnUrl?: string;
}): Promise<AgeEligibilityPurchaseReturnResult> {
  const verificationRequestId = input.verificationRequestId.trim();
  const sessionSubject = input.suiAddress.trim();
  if (!verificationRequestId || !sessionSubject) {
    return { ok: false, error: "verification_request_id required", code: "missing" };
  }

  const vr = await resolvePurchaseReturnBinding({
    verificationRequestId,
    sessionSubject,
  });
  if (!vr.ok) {
    return { ok: false, error: "Verification request not ready for return", code: vr.code };
  }

  if (!isCanonicalGoodTroublePurchaseFlow({
    partnerId: vr.partnerId,
    policyId: vr.policyId,
    purpose: vr.purpose,
  })) {
    return { ok: false, error: "Not an age-eligibility purchase flow", code: "invalid_flow" };
  }

  const policy = await getPolicy(vr.policyId);
  if (!policy || !isAgeEligibilityOnlyPolicy(policy.rules_json)) {
    return { ok: false, error: "Policy is not L0 age eligibility", code: "invalid_policy" };
  }

  const store = createSupabaseContinuationStore();
  const stored = await store.peekByVerifyRequestId(verificationRequestId);
  if (!stored) {
    return { ok: false, error: "Return binding not found", code: "missing" };
  }

  const continuationMatch = assertPurchaseReturnContinuation({
    stored,
    partnerId: vr.partnerId,
    policyId: vr.policyId,
    clientReturnUrl: input.clientReturnUrl,
  });
  if (!continuationMatch.ok) {
    return {
      ok: false,
      error: "Return URL binding rejected",
      code: continuationMatch.code,
    };
  }

  const alreadyReturned = Boolean(stored.consumedAt);
  if (!alreadyReturned && !continuationIsUsable(stored)) {
    return { ok: false, error: "Return binding expired", code: "stale" };
  }

  if (!await isReturnUrlAllowed(vr.partnerId, stored.returnUrl)) {
    return { ok: false, error: "Return URL not allowlisted", code: "open_redirect" };
  }

  const issued = isOpaqueVerifyRequest(verificationRequestId)
    ? await findReceiptForOpaqueVerifyRequest({
      verifyRequestId: verificationRequestId,
      subjectId: sessionSubject,
    })
    : await findReceiptForVerificationRequest({
      verificationRequestId,
      subjectId: sessionSubject,
    });
  if (!issued) {
    return { ok: false, error: "Decision receipt not found", code: "missing_receipt" };
  }

  const receiptId = input.receiptId?.trim() || issued.receipt_id;
  if (receiptId !== issued.receipt_id) {
    return { ok: false, error: "Receipt does not match verification request", code: "receipt_mismatch" };
  }

  const receipt = await getReceiptById(receiptId);
  if (!receipt) {
    return { ok: false, error: "Receipt not found", code: "missing_receipt" };
  }
  if (receipt.partner_id !== vr.partnerId || receipt.policy_id !== vr.policyId) {
    return { ok: false, error: "Receipt partner binding rejected", code: "cross_partner" };
  }
  if (receipt.decision_result !== "approved") {
    return { ok: false, error: "Receipt decision not approved", code: "denied" };
  }

  const clientHint = input.clientReturnUrl?.trim();
  if (clientHint && !goodTroublePurchaseReturnUrlBindingAllowed(stored.returnUrl, clientHint)) {
    logGoodTroublePurchaseReturnDiagnostic(buildPurchaseReturnDiagnostic({
      stage: "return_failed",
      code: "open_redirect",
      verifyRequestId: verificationRequestId,
      storedReturnUrl: stored.returnUrl,
      mergedHint: clientHint,
    }));
    return {
      ok: false,
      error: "Return URL binding rejected",
      code: "open_redirect",
    };
  }

  const resolvedReturn = await resolveAndPersistGoodTroublePurchaseReturnUrl({
    stored,
    hints: [clientHint],
  });
  const redirectBase = resolvedReturn.redirectBase;

  if (isGoodTroublePurchaseCallbackPath(new URL(redirectBase).pathname)) {
    if (!extractGoodTroubleFlowToken(redirectBase)) {
      logGoodTroublePurchaseReturnDiagnostic(buildPurchaseReturnDiagnostic({
        stage: "return_url_bare",
        code: "missing_flow_token_bare_binding",
        verifyRequestId: verificationRequestId,
        storedReturnUrl: stored.returnUrl,
        mergedHint: clientHint,
      }));
      return {
        ok: false,
        error: "Good Trouble purchase return requires flow binding (gtv)",
        code: "missing_flow_token",
      };
    }
    if (resolvedReturn.storedUpgraded) {
      logGoodTroublePurchaseReturnDiagnostic(buildPurchaseReturnDiagnostic({
        stage: "return_url_upgraded",
        code: "gtv_restored",
        verifyRequestId: verificationRequestId,
        storedReturnUrl: redirectBase,
        mergedHint: clientHint,
      }));
    }
  }

  const redirectParams: Record<string, string> = {
    status: "approved",
    decision_id: issued.decision_id,
    receipt_id: receiptId,
    policy_id: vr.policyId,
    partner_id: vr.partnerId,
  };
  if (receipt.expires_at) {
    redirectParams.receipt_expires_at = receipt.expires_at;
  }

  const redirect_url = buildRedirectUrl(redirectBase, redirectParams);

  if (
    isGoodTroublePurchaseCallbackPath(new URL(redirect_url).pathname)
    && !extractGoodTroubleFlowToken(redirect_url)
  ) {
    return {
      ok: false,
      error: "Good Trouble purchase return requires flow binding (gtv)",
      code: "missing_flow_token",
    };
  }

  if (alreadyReturned) {
    return {
      ok: true,
      redirect_url,
      receipt_id: receiptId,
      decision_id: issued.decision_id,
      replay: true,
    };
  }

  const consumed = await store.consume(stored.jti);
  if (!consumed) {
    return {
      ok: true,
      redirect_url,
      receipt_id: receiptId,
      decision_id: issued.decision_id,
      replay: true,
    };
  }

  return {
    ok: true,
    redirect_url,
    receipt_id: receiptId,
    decision_id: issued.decision_id,
    replay: false,
  };
}
