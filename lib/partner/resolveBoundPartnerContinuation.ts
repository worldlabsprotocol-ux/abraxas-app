// FILE: lib/partner/resolveBoundPartnerContinuation.ts
// Bind a continuation by cookie pointer when present, else session + store + VR.

import { normalizeSuiAddress } from "@mysten/sui/utils";
import type { NextRequest } from "next/server";
import {
  CONTINUATION_STORE_UNAVAILABLE,
  ContinuationStoreUnavailableError,
  type PartnerFlowContinuationRecord,
} from "@/lib/partner/partnerFlowContinuation";
import { createSupabaseContinuationStore } from "@/lib/partner/partnerFlowContinuationStore";
import { getPartnerPolicy, getPartnerPolicyAtVersion } from "@/lib/policy/getPolicy";
import { requireSupabaseAdmin, SupabaseAdminConfigurationError } from "@/lib/supabase/admin";
import {
  PARTNER_CONTINUE_BINDING_COOKIE,
  verifyPartnerContinueBindingCookie,
} from "@/lib/partner/partnerVerifyResumeCookie";

export type BoundContinuationResult =
  | { ok: true; stored: PartnerFlowContinuationRecord; bindingPresent: boolean }
  | {
    ok: false;
    code: string;
    bindingPresent: boolean;
    clearBinding: boolean;
  };

type VerificationBindingRow = {
  partner_id: string;
  policy_id: string;
  sui_address?: string | null;
  status?: string | null;
  expires_at?: string | null;
};

function continuationNotExpired(record: PartnerFlowContinuationRecord, now = Date.now()): boolean {
  const expires = Date.parse(record.expiresAt);
  return Number.isFinite(expires) && expires > now;
}

async function loadVerificationBinding(verifyRequestId: string): Promise<
  { ok: true; row: VerificationBindingRow } | { ok: false; code: string }
> {
  try {
    const sb = requireSupabaseAdmin();
    const { data, error } = await sb
      .from("verification_requests")
      .select("partner_id, policy_id, sui_address, status, expires_at")
      .eq("id", verifyRequestId)
      .maybeSingle();
    if (error) return { ok: false, code: CONTINUATION_STORE_UNAVAILABLE };
    if (!data) return { ok: false, code: "missing" };
    return { ok: true, row: data as VerificationBindingRow };
  } catch (error) {
    if (error instanceof SupabaseAdminConfigurationError) {
      return { ok: false, code: CONTINUATION_STORE_UNAVAILABLE };
    }
    return { ok: false, code: CONTINUATION_STORE_UNAVAILABLE };
  }
}

function bindVerificationToContinuation(input: {
  stored: PartnerFlowContinuationRecord;
  row: VerificationBindingRow;
  sessionSubject: string;
}): { ok: true } | { ok: false; code: string } {
  const status = String(input.row.status ?? "");
  if (status === "decided" || status === "consumed" || status === "cancelled") {
    return { ok: false, code: "replay" };
  }
  if (input.row.expires_at) {
    const expires = Date.parse(String(input.row.expires_at));
    if (!Number.isFinite(expires) || expires <= Date.now()) {
      return { ok: false, code: "stale" };
    }
  }
  const subject = String(input.row.sui_address ?? "").trim();
  if (subject) {
    try {
      if (normalizeSuiAddress(subject) !== normalizeSuiAddress(input.sessionSubject)) {
        return { ok: false, code: "invalid_session" };
      }
    } catch {
      return { ok: false, code: "invalid_session" };
    }
  }
  if (String(input.row.partner_id ?? "").trim() !== input.stored.partnerId.trim()) {
    return { ok: false, code: "cross_partner" };
  }
  if (String(input.row.policy_id ?? "").trim() !== input.stored.policyId.trim()) {
    return { ok: false, code: "altered_policy" };
  }
  return { ok: true };
}

async function bindAuthoritativePolicyVersion(stored: PartnerFlowContinuationRecord): Promise<
  { ok: true; policyVersion: number } | { ok: false; code: string }
> {
  try {
    const policy = stored.policyVersion != null
      ? await getPartnerPolicyAtVersion(stored.policyId, stored.policyVersion)
      : await getPartnerPolicy(stored.policyId);
    if (!policy) {
      return { ok: false, code: stored.policyVersion != null ? "altered_version" : "missing" };
    }
    if (String(policy.partner_id ?? "").trim() !== stored.partnerId.trim()) {
      return { ok: false, code: "cross_partner" };
    }
    if (String(policy.id ?? "").trim() !== stored.policyId.trim()) {
      return { ok: false, code: "altered_policy" };
    }
    if (
      stored.policyVersion != null
      && policy.version !== stored.policyVersion
    ) {
      return { ok: false, code: "altered_version" };
    }
    return { ok: true, policyVersion: policy.version };
  } catch (error) {
    if (error instanceof SupabaseAdminConfigurationError) {
      return { ok: false, code: CONTINUATION_STORE_UNAVAILABLE };
    }
    return { ok: false, code: CONTINUATION_STORE_UNAVAILABLE };
  }
}

export async function resolveBoundPartnerContinuation(input: {
  request: NextRequest;
  verifyRequestId: string;
  sessionSubject: string;
}): Promise<BoundContinuationResult> {
  const verifyRequestId = input.verifyRequestId.trim();
  const sessionSubject = input.sessionSubject.trim();
  if (!verifyRequestId || !sessionSubject) {
    return { ok: false, code: "missing", bindingPresent: false, clearBinding: false };
  }

  const token = input.request.cookies.get(PARTNER_CONTINUE_BINDING_COOKIE)?.value;
  const bindingPresent = Boolean(token);
  const pointer = token ? await verifyPartnerContinueBindingCookie(token) : null;
  if (bindingPresent && (!pointer || pointer.verifyRequestId !== verifyRequestId)) {
    return { ok: false, code: "invalid_binding", bindingPresent: true, clearBinding: true };
  }

  let stored: PartnerFlowContinuationRecord | null;
  try {
    stored = await createSupabaseContinuationStore().peekByVerifyRequestId(verifyRequestId);
  } catch (error) {
    if (error instanceof ContinuationStoreUnavailableError) {
      return { ok: false, code: CONTINUATION_STORE_UNAVAILABLE, bindingPresent, clearBinding: false };
    }
    return { ok: false, code: CONTINUATION_STORE_UNAVAILABLE, bindingPresent, clearBinding: false };
  }
  if (!stored) {
    return { ok: false, code: "missing", bindingPresent, clearBinding: false };
  }
  if (!continuationNotExpired(stored)) {
    return { ok: false, code: "stale", bindingPresent, clearBinding: false };
  }

  const vr = await loadVerificationBinding(verifyRequestId);
  if (!vr.ok) {
    return { ok: false, code: vr.code, bindingPresent, clearBinding: false };
  }
  const matched = bindVerificationToContinuation({
    stored,
    row: vr.row,
    sessionSubject,
  });
  if (!matched.ok) {
    return { ok: false, code: matched.code, bindingPresent, clearBinding: false };
  }
  const policy = await bindAuthoritativePolicyVersion(stored);
  if (!policy.ok) {
    return { ok: false, code: policy.code, bindingPresent, clearBinding: false };
  }
  return {
    ok: true,
    stored: { ...stored, policyVersion: policy.policyVersion },
    bindingPresent,
  };
}
