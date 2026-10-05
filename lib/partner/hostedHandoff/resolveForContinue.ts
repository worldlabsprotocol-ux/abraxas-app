// FILE: lib/partner/hostedHandoff/resolveForContinue.ts
// Bridge durable hosted handoffs to /partner/continue — read-only until protocol completion.

import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { opaqueCallbackRef } from "@/lib/partner/launchpad/partnerFlowRequest/view";
import {
  assertContinuationMatchesStored,
  createPartnerFlowContinuationRecord,
  type PartnerFlowContinuationRecord,
} from "@/lib/partner/partnerFlowContinuation";
import { createSupabaseContinuationStore } from "@/lib/partner/partnerFlowContinuationStore";
import { isOpaqueVerifyRequest } from "@/lib/partner/productionIntegration/requestCorrelation";
import { parsePartnerFlowInstant } from "@/lib/partner/parsePartnerFlowInstant";
import { logHostedHandoffContinueDiagnostic } from "./continueContextDiagnostics";
import type { ContinueContextTraceCollector } from "./continueContextTrace";
import { loadHandoffByVerifyRequest } from "./store";
import type { HostedHandoffRecord } from "./types";

export type HostedHandoffContinueResolveOptions = {
  trace?: ContinueContextTraceCollector;
};

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

function hostedHandoffContinuationExpired(
  record: PartnerFlowContinuationRecord,
  now = Date.now(),
): { expired: boolean; parsedExpiryEpoch: number | null } {
  const parsedExpiryEpoch = parsePartnerFlowInstant(record.expiresAt);
  if (parsedExpiryEpoch === null) return { expired: true, parsedExpiryEpoch: null };
  return { expired: parsedExpiryEpoch <= now, parsedExpiryEpoch };
}

function reuseHostedHandoffContinuation(input: {
  existing: PartnerFlowContinuationRecord | null;
  handoff: HostedHandoffRecord;
  returnUrl: string;
  verifyRequestRef?: string;
}): PartnerFlowContinuationRecord | null {
  const { existing } = input;
  if (!existing) return null;
  if (existing.consumedAt) {
    logHostedHandoffContinueDiagnostic({
      stage: "continuation_reuse_consumed",
      verifyRequestRef: input.verifyRequestRef ?? input.handoff.verify_request,
      handoffRef: input.handoff.handoff_ref,
      continuationJti: existing.jti,
      errorClass: "Error",
      internalCode: "continuation_consumed",
      consumed: true,
      peekFound: true,
      functionName: "reuseHostedHandoffContinuation",
    });
    throw Object.assign(new Error("continuation_consumed"), { code: "unavailable" });
  }
  const expiry = hostedHandoffContinuationExpired(existing);
  if (expiry.expired) {
    logHostedHandoffContinueDiagnostic({
      stage: "continuation_reuse_expired",
      verifyRequestRef: input.verifyRequestRef ?? input.handoff.verify_request,
      handoffRef: input.handoff.handoff_ref,
      continuationJti: existing.jti,
      errorClass: "Error",
      internalCode: "continuation_expired",
      rawExpiresAt: existing._diagRawExpiresAt ?? existing.expiresAt,
      mappedExpiresAt: existing.expiresAt,
      parsedExpiryEpoch: expiry.parsedExpiryEpoch,
      nowEpoch: Date.now(),
      expired: true,
      consumed: false,
      peekFound: true,
      functionName: "reuseHostedHandoffContinuation",
    });
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
    logHostedHandoffContinueDiagnostic({
      stage: "continuation_reuse_binding",
      verifyRequestRef: input.verifyRequestRef ?? input.handoff.verify_request,
      handoffRef: input.handoff.handoff_ref,
      continuationJti: existing.jti,
      errorClass: "Error",
      internalCode: "continuation_binding_conflict",
      bindingOk: false,
      bindingCode: matched.code,
      consumed: false,
      expired: false,
      peekFound: true,
      functionName: "reuseHostedHandoffContinuation",
    });
    throw Object.assign(new Error("continuation_binding_conflict"), { code: "unavailable" });
  }
  return existing;
}

function postgresErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object" || !("code" in error)) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

async function ensureHostedHandoffContinuation(input: {
  handoff: HostedHandoffRecord;
  returnUrl: string;
  appSlug: string | null;
  trace?: ContinueContextTraceCollector;
}): Promise<PartnerFlowContinuationRecord> {
  input.trace?.record("ensure_enter");
  input.trace?.record("store_created");
  const store = createSupabaseContinuationStore({ trace: input.trace, traceContext: "primary" });
  const verifyRequestRef = input.handoff.verify_request;

  const created = createPartnerFlowContinuationRecord({
    partnerId: input.handoff.partner_id,
    policyId: input.handoff.policy_id,
    returnUrl: input.returnUrl,
    purpose: input.handoff.purpose,
    appSlug: input.appSlug ?? undefined,
    policyVersion: input.handoff.policy_version,
  });
  if (!created) {
    logHostedHandoffContinueDiagnostic({
      stage: "continuation_create_rejected",
      verifyRequestRef,
      handoffRef: input.handoff.handoff_ref,
      errorClass: "Error",
      internalCode: "continuation_rejected",
      peekFound: false,
      functionName: "ensureHostedHandoffContinuation",
    });
    throw Object.assign(new Error("continuation_rejected"), { code: "unavailable" });
  }

  const continuation: PartnerFlowContinuationRecord = {
    ...created,
    expiresAt: input.handoff.expires_at,
    verifyRequestId: input.handoff.verify_request,
  };

  let ensured;
  try {
    ensured = await store.ensureByOpaqueVerifyRequest(continuation, { verifyRequestRef });
  } catch (error) {
    logHostedHandoffContinueDiagnostic({
      stage: "continuation_opaque_ensure",
      verifyRequestRef,
      handoffRef: input.handoff.handoff_ref,
      errorClass: error instanceof Error ? error.name : "Error",
      internalCode: error instanceof Error && "code" in error
        ? String((error as { code?: string }).code)
        : "continuation_opaque_ensure_throw",
      postgresCode: postgresErrorCode(error),
      functionName: "ensureHostedHandoffContinuation.ensureByOpaqueVerifyRequest",
    });
    throw error;
  }

  logHostedHandoffContinueDiagnostic({
    stage: "continuation_opaque_ensure",
    verifyRequestRef,
    handoffRef: input.handoff.handoff_ref,
    continuationJti: ensured.record.jti,
    internalCode: ensured.wasCreated ? "continuation_created" : "continuation_reused",
    peekFound: !ensured.wasCreated,
    consumed: Boolean(ensured.record.consumedAt),
    rawExpiresAt: ensured.record._diagRawExpiresAt,
    mappedExpiresAt: ensured.record.expiresAt,
    functionName: "ensureHostedHandoffContinuation.ensureByOpaqueVerifyRequest",
  });

  const reused = reuseHostedHandoffContinuation({
    existing: ensured.record,
    handoff: input.handoff,
    returnUrl: input.returnUrl,
    verifyRequestRef,
  });
  if (reused) {
    input.trace?.record("reuse_return");
    return reused;
  }

  throw Object.assign(new Error("continuation_unavailable"), { code: "unavailable" });
}

/** Resolve a server-bound hosted handoff for holder /partner/continue. Does not consume. */
export async function resolveHostedHandoffForContinue(
  verifyRequest: string,
  options?: HostedHandoffContinueResolveOptions,
): Promise<HostedHandoffContinueResolveResult> {
  options?.trace?.record("resolver_enter");
  const trimmed = verifyRequest.trim();
  if (!isOpaqueVerifyRequest(trimmed)) {
    return { ok: false, code: "missing" };
  }

  let handoff: HostedHandoffRecord | null;
  try {
    handoff = await loadHandoffByVerifyRequest(trimmed);
  } catch (error) {
    logHostedHandoffContinueDiagnostic({
      stage: "handoff_load_throw",
      verifyRequestRef: trimmed,
      errorClass: error instanceof Error ? error.name : "Error",
      internalCode: "handoff_load_throw",
      functionName: "resolveHostedHandoffForContinue.loadHandoffByVerifyRequest",
    });
    return { ok: false, code: "unavailable" };
  }
  if (!handoff) {
    return { ok: false, code: "missing" };
  }
  if (handoff.status !== "created") {
    const code = handoffUnavailableStatus(handoff);
    if (code === "unavailable") {
      logHostedHandoffContinueDiagnostic({
        stage: "handoff_status",
        verifyRequestRef: trimmed,
        handoffRef: handoff.handoff_ref,
        internalCode: handoff.status,
        functionName: "resolveHostedHandoffForContinue",
      });
    }
    return { ok: false, code };
  }
  const expires = parsePartnerFlowInstant(handoff.expires_at);
  if (expires === null || expires <= Date.now()) {
    return { ok: false, code: "expired" };
  }

  let app;
  try {
    app = await getLaunchpadApplicationForPartner(handoff.application_id, handoff.partner_id);
  } catch (error) {
    logHostedHandoffContinueDiagnostic({
      stage: "application_load_throw",
      verifyRequestRef: trimmed,
      handoffRef: handoff.handoff_ref,
      errorClass: error instanceof Error ? error.name : "Error",
      internalCode: "application_load_throw",
      functionName: "resolveHostedHandoffForContinue.getLaunchpadApplicationForPartner",
    });
    return { ok: false, code: "unavailable" };
  }
  if (!app) {
    return { ok: false, code: "missing" };
  }

  const returnUrl = resolveHandoffCallbackUrl(app.allowed_return_urls ?? [], handoff.callback_ref);
  if (!returnUrl) {
    logHostedHandoffContinueDiagnostic({
      stage: "callback_ref_unresolved",
      verifyRequestRef: trimmed,
      handoffRef: handoff.handoff_ref,
      internalCode: "callback_ref_unresolved",
      functionName: "resolveHostedHandoffForContinue.resolveHandoffCallbackUrl",
    });
    return { ok: false, code: "unavailable" };
  }

  let continuation: PartnerFlowContinuationRecord;
  try {
    continuation = await ensureHostedHandoffContinuation({
      handoff,
      returnUrl,
      appSlug: app.public_slug,
      trace: options?.trace,
    });
  } catch (error) {
    options?.trace?.record("ensure_throw");
    logHostedHandoffContinueDiagnostic({
      stage: "continuation_ensure_throw",
      verifyRequestRef: trimmed,
      handoffRef: handoff.handoff_ref,
      errorClass: error instanceof Error ? error.name : "Error",
      internalCode: error instanceof Error && "code" in error
        ? String((error as { code?: string }).code)
        : "continuation_ensure_throw",
      postgresCode: postgresErrorCode(error),
      functionName: "resolveHostedHandoffForContinue.ensureHostedHandoffContinuation",
    });
    return { ok: false, code: "unavailable" };
  }

  options?.trace?.record("resolver_return");
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
