// FILE: lib/partner/hostedHandoff/resolveForContinue.ts
// Bridge durable hosted handoffs to /partner/continue — read-only until protocol completion.

import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { opaqueCallbackRef } from "@/lib/partner/launchpad/partnerFlowRequest/view";
import {
  assertContinuationMatchesStored,
  ContinuationUniqueConflictError,
  createPartnerFlowContinuationRecord,
  type PartnerFlowContinuationRecord,
} from "@/lib/partner/partnerFlowContinuation";
import { createSupabaseContinuationStore } from "@/lib/partner/partnerFlowContinuationStore";
import { isOpaqueVerifyRequest } from "@/lib/partner/productionIntegration/requestCorrelation";
import { parsePartnerFlowInstant } from "@/lib/partner/parsePartnerFlowInstant";
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
  const expires = parsePartnerFlowInstant(record.expires_at);
  if (expires === null || expires <= Date.now()) return "expired";
  return "unavailable";
}

function hostedHandoffContinuationExpired(record: PartnerFlowContinuationRecord, now = Date.now()): boolean {
  const expires = parsePartnerFlowInstant(record.expiresAt);
  if (expires === null) return true;
  return expires <= now;
}

function reuseHostedHandoffContinuation(input: {
  existing: PartnerFlowContinuationRecord | null;
  handoff: HostedHandoffRecord;
  returnUrl: string;
}): PartnerFlowContinuationRecord | null {
  const { existing } = input;
  if (!existing) return null;
  if (existing.consumedAt) {
    throw Object.assign(new Error("continuation_consumed"), { code: "unavailable" });
  }
  if (hostedHandoffContinuationExpired(existing)) {
    throw Object.assign(new Error("continuation_expired"), { code: "unavailable" });
  }
  const matched = assertContinuationMatchesStored({
    stored: existing,
    partnerId: input.handoff.partner_id,
    policyId: input.handoff.policy_id,
    returnUrl: input.returnUrl,
    policyVersion: input.handoff.policy_version,
  });
  if (!matched.ok) {
    throw Object.assign(new Error("continuation_binding_conflict"), { code: "unavailable" });
  }
  return existing;
}

async function ensureHostedHandoffContinuation(input: {
  handoff: HostedHandoffRecord;
  returnUrl: string;
  appSlug: string | null;
}): Promise<PartnerFlowContinuationRecord> {
  const store = createSupabaseContinuationStore();
  const reused = reuseHostedHandoffContinuation({
    existing: await store.peekByVerifyRequestId(input.handoff.verify_request),
    handoff: input.handoff,
    returnUrl: input.returnUrl,
  });
  if (reused) return reused;

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
  try {
    await store.save(continuation);
    return continuation;
  } catch (error) {
    if (error instanceof ContinuationUniqueConflictError) {
      const winner = reuseHostedHandoffContinuation({
        existing: await store.peekByVerifyRequestId(input.handoff.verify_request),
        handoff: input.handoff,
        returnUrl: input.returnUrl,
      });
      if (winner) return winner;
    }
    throw error;
  }
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
  const expires = parsePartnerFlowInstant(handoff.expires_at);
  if (expires === null || expires <= Date.now()) {
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
