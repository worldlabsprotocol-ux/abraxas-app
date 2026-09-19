// FILE: lib/partner/resolveContinuationStore.ts

import {
  continuationIsUsable,
  type PartnerFlowContinuationRecord,
  type PartnerFlowContinuationStore,
} from "@/lib/partner/partnerFlowContinuation";
import { createSupabaseContinuationStore } from "@/lib/partner/partnerFlowContinuationStore";
import type { PartnerVerifyResumeCookiePayload } from "@/lib/partner/partnerVerifyResumeCookie";

export function cookiePayloadToRecord(
  payload: PartnerVerifyResumeCookiePayload,
): PartnerFlowContinuationRecord | null {
  if (!payload.jti) return null;
  const record: PartnerFlowContinuationRecord = {
    jti: payload.jti,
    partnerId: payload.partnerId,
    policyId: payload.policyId,
    policyVersion: payload.policyVersion,
    returnUrl: payload.returnUrl,
    permission: payload.permission,
    permissionVersion: payload.permissionVersion,
    purpose: payload.purpose,
    appSlug: payload.appSlug,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    consumedAt: null,
  };
  return continuationIsUsable(record) ? record : null;
}

export function createOnceStore(record: PartnerFlowContinuationRecord): PartnerFlowContinuationStore {
  let consumed = false;
  return {
    async save() {},
    async peek(jti) {
      if (jti !== record.jti || consumed) return null;
      return record;
    },
    async consume(jti) {
      if (jti !== record.jti || consumed) return null;
      consumed = true;
      return record;
    },
  };
}

export async function resolveContinuationStore(
  payload: PartnerVerifyResumeCookiePayload | null,
): Promise<PartnerFlowContinuationStore> {
  const cookieRecord = payload ? cookiePayloadToRecord(payload) : null;
  if (!payload?.jti) {
    return cookieRecord ? createOnceStore(cookieRecord) : createOnceStore({
      jti: "missing",
      partnerId: "",
      policyId: "",
      returnUrl: "",
      createdAt: new Date().toISOString(),
      expiresAt: new Date().toISOString(),
    });
  }

  try {
    const supabase = createSupabaseContinuationStore();
    const stored = await supabase.peek(payload.jti);
    if (stored) return supabase;
  } catch {
    // Preview or local without the continuations table.
  }

  if (cookieRecord) return createOnceStore(cookieRecord);
  return createSupabaseContinuationStore();
}
