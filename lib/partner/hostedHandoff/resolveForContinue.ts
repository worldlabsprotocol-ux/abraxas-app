// FILE: lib/partner/hostedHandoff/resolveForContinue.ts
// Bridge durable hosted handoffs to /partner/continue — read-only until protocol completion.

import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { opaqueCallbackRef } from "@/lib/partner/launchpad/partnerFlowRequest/view";
import {
  continuationIsUsable,
  createPartnerFlowContinuationRecord,
  type PartnerFlowContinuationRecord,
} from "@/lib/partner/partnerFlowContinuation";
import { createSupabaseContinuationStore } from "@/lib/partner/partnerFlowContinuationStore";
import { isOpaqueVerifyRequest } from "@/lib/partner/productionIntegration/requestCorrelation";
import { loadHandoffByVerifyRequest } from "./store";
import type { HostedHandoffRecord } from "./types";

export type HostedHandoffContinueResolveCode =
  | "missing"
  | "expired"
  | "completed"
  | "cancelled"
  | "unavailable";

export interface HostedHandoffContinuePreview {
  verify_request: string;
  handoff_ref: string;
  partner_id: string;
  policy_id: string;
  policy_version: number;
  purpose: string;
  application_id: string;
  public_slug: string | null;
  display_label: string;
  environment: "sandbox" | "production";
  action: string;
  result_family: string | null;
  expires_at: string;
  return_url: string;
}

export type HostedHandoffContinueResolveResult =
  | { ok: true; preview: HostedHandoffContinuePreview; continuation: PartnerFlowContinuationRecord }
  | { ok: false; code: HostedHandoffContinueResolveCode };

export function resolveHandoffCallbackUrl(
  allowedReturnUrls: readonly string[],
  callbackRef: string,
): string | null {
  for (const url of allowedReturnUrls) {
    if (opaqueCallbackRef(url) === callbackRef) return url;
  }
  return null;
}

function handoffUnavailableStatus(record: HostedHandoffRecord): HostedHandoffContinueResolveCode {
  if (record.status === "expired") return "expired";
  if (record.status === "completed" || record.status === "consumed") return "completed";
  if (record.status === "cancelled") return "cancelled";
  if (record.status !== "created") return "unavailable";
  const expires = Date.parse(record.expires_at);
  if (!Number.isFinite(expires) || expires <= Date.now()) return "expired";
  return "unavailable";
}

async function ensureHostedHandoffContinuation(input: {
  handoff: HostedHandoffRecord;
  returnUrl: string;
  appSlug: string | null;
}): Promise<PartnerFlowContinuationRecord> {
  const store = createSupabaseContinuationStore();
  const existing = await store.peekByVerifyRequestId(input.handoff.verify_request);
  if (continuationIsUsable(existing)) {
    if (
      existing.partnerId === input.handoff.partner_id
      && existing.policyId === input.handoff.policy_id
      && existing.returnUrl === input.returnUrl
    ) {
      return existing;
    }
  }

  const created = createPartnerFlowContinuationRecord({
    partnerId: input.handoff.partner_id,
    policyId: input.handoff.policy_id,
    returnUrl: input.returnUrl,
    purpose: input.handoff.purpose,
    appSlug: input.appSlug ?? undefined,
    policyVersion: input.handoff.policy_version,
  });
  if (!created) {
    throw Object.assign(new Error("continuation_rejected"), { code: "unavailable" });
  }

  const continuation: PartnerFlowContinuationRecord = {
    ...created,
    expiresAt: input.handoff.expires_at,
    verifyRequestId: input.handoff.verify_request,
  };
  await store.save(continuation);
  return continuation;
}

/** Resolve a server-bound hosted handoff for holder /partner/continue. Does not consume. */
export async function resolveHostedHandoffForContinue(
  verifyRequest: string,
): Promise<HostedHandoffContinueResolveResult> {
  const trimmed = verifyRequest.trim();
  if (!isOpaqueVerifyRequest(trimmed)) {
    return { ok: false, code: "missing" };
  }

  let handoff: HostedHandoffRecord | null;
  try {
    handoff = await loadHandoffByVerifyRequest(trimmed);
  } catch {
    return { ok: false, code: "unavailable" };
  }
  if (!handoff) {
    return { ok: false, code: "missing" };
  }
  if (handoff.status !== "created") {
    return { ok: false, code: handoffUnavailableStatus(handoff) };
  }
  const expires = Date.parse(handoff.expires_at);
  if (!Number.isFinite(expires) || expires <= Date.now()) {
    return { ok: false, code: "expired" };
  }

  let app;
  try {
    app = await getLaunchpadApplicationForPartner(handoff.application_id, handoff.partner_id);
  } catch {
    return { ok: false, code: "unavailable" };
  }
  if (!app) {
    return { ok: false, code: "missing" };
  }

  const returnUrl = resolveHandoffCallbackUrl(app.allowed_return_urls ?? [], handoff.callback_ref);
  if (!returnUrl) {
    return { ok: false, code: "unavailable" };
  }

  let continuation: PartnerFlowContinuationRecord;
  try {
    continuation = await ensureHostedHandoffContinuation({
      handoff,
      returnUrl,
      appSlug: app.public_slug,
    });
  } catch (error) {
    const code = error instanceof Error && "code" in error
      ? String((error as { code?: string }).code)
      : "unavailable";
    return { ok: false, code: code === "unavailable" ? "unavailable" : "unavailable" };
  }

  return {
    ok: true,
    preview: {
      verify_request: handoff.verify_request,
      handoff_ref: handoff.handoff_ref,
      partner_id: handoff.partner_id,
      policy_id: handoff.policy_id,
      policy_version: handoff.policy_version,
      purpose: handoff.purpose,
      application_id: handoff.application_id,
      public_slug: app.public_slug,
      display_label: app.display_name,
      environment: handoff.environment,
      action: handoff.action,
      result_family: handoff.result_family,
      expires_at: handoff.expires_at,
      return_url: returnUrl,
    },
    continuation,
  };
}
