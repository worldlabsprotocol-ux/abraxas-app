// FILE: lib/partner/integrationKit/verificationRequest.ts
// Universal Verify-with-Abraxas request + callback contracts. Composes existing public APIs only.

import { buildPartnerFlowEntryUrl } from "@/lib/partner/partnerFlowIntegratorKit";
import {
  embedRequestIdInReturnUrl,
  issuePartnerRequestCorrelation,
  isOpaqueVerifyRequest,
  PARTNER_REQUEST_ID_PREFIX,
  PARTNER_VERIFY_REQUEST_PREFIX,
} from "@/lib/partner/productionIntegration/requestCorrelation";
import type { NarrowPartnerResult } from "@/lib/partner/narrowPartnerResult/contract";
import type { PartnerKitSafeResult } from "@/lib/partner/integrationKit/client";

function verificationPermitsAction(result: PartnerKitSafeResult): boolean {
  return result.outcome === "permitted" && result.action === "permit";
}
import {
  resolvePolicyIntegrationCapabilities,
  validateVerificationRequestCapabilities,
} from "@/lib/partner/integrationKit/policyCapabilities";

export const UNIVERSAL_INTEGRATION_ERROR_CATEGORIES = [
  "invalid_request",
  "expired_request",
  "invalid_callback",
  "receipt_invalid",
  "receipt_expired",
  "receipt_revoked",
  "policy_mismatch",
  "application_mismatch",
  "result_denied",
  "rate_limited",
  "temporarily_unavailable",
] as const;

export type UniversalIntegrationErrorCategory = (typeof UNIVERSAL_INTEGRATION_ERROR_CATEGORIES)[number];

export type VerificationRequestMode = "redirect" | "hosted_handoff";

export interface CreateVerificationRequestInput {
  returnUrl: string;
  mode?: VerificationRequestMode;
  purpose?: string;
  bindingId?: string;
  /** SHA-256 hex of exact artifact bytes when the bound policy requires source integrity. */
  expectedContentHash?: string;
  /** Partner-owned opaque resume state (non-sensitive, bounded). Never used as verification evidence. */
  partnerState?: string;
  /** When set, reuse this correlation id instead of issuing a new req_* binding. */
  requestId?: string;
}

export interface VerificationRequestSuccess {
  ok: true;
  request_id: string;
  verification_url: string;
  expires_at: string | null;
  mode: VerificationRequestMode;
  handoff_ref?: string;
}

export interface VerificationRequestFailure {
  ok: false;
  category: UniversalIntegrationErrorCategory;
  errors: string[];
}

export type VerificationRequestResult = VerificationRequestSuccess | VerificationRequestFailure;

export interface VerifyCallbackWithNarrowResultInput {
  search: URLSearchParams | Record<string, string | string[] | undefined>;
  expectedRequestId?: string;
}

export interface VerifyCallbackWithNarrowResultSuccess {
  ok: true;
  verification: PartnerKitSafeResult;
  narrow: NarrowPartnerResult;
  category: null;
  errors: [];
}

export interface VerifyCallbackWithNarrowResultFailure {
  ok: false;
  verification: PartnerKitSafeResult | null;
  narrow: NarrowPartnerResult | null;
  category: UniversalIntegrationErrorCategory;
  errors: string[];
}

export type VerifyCallbackWithNarrowResultResult =
  | VerifyCallbackWithNarrowResultSuccess
  | VerifyCallbackWithNarrowResultFailure;

const PARTNER_STATE_MAX_LEN = 128;
const PARTNER_STATE_PATTERN = /^[A-Za-z0-9._-]+$/;

export function embedPartnerStateInReturnUrl(returnUrl: string, partnerState: string): string {
  const trimmed = partnerState.trim();
  if (!trimmed) return returnUrl;
  if (trimmed.length > PARTNER_STATE_MAX_LEN || !PARTNER_STATE_PATTERN.test(trimmed)) {
    throw new Error("invalid_partner_state");
  }
  const url = new URL(returnUrl);
  url.searchParams.set("partner_state", trimmed);
  return url.toString();
}

export function categorizeIntegrationErrors(errors: string[]): UniversalIntegrationErrorCategory {
  const joined = errors.join(" ").toLowerCase();
  if (errors.some((e) => e === "rate_limited" || e.includes("rate_limit"))) return "rate_limited";
  if (errors.some((e) => e.includes("retry") || e === "receipt_fetch_failed" || e === "narrow_result_fetch_failed")) {
    return "temporarily_unavailable";
  }
  if (errors.some((e) => e === "request_correlation_missing" || e.startsWith("request_correlation_"))) {
    return "invalid_callback";
  }
  if (errors.some((e) => e === "receipt_expired" || e.includes("expired"))) return "receipt_expired";
  if (errors.some((e) => e === "receipt_revoked" || e.includes("revoked"))) return "receipt_revoked";
  if (errors.some((e) => e.startsWith("policy_mismatch") || e === "narrow_result_policy_mismatch")) {
    return "policy_mismatch";
  }
  if (errors.some((e) => e.startsWith("partner_mismatch") || e === "narrow_result_partner_mismatch")) {
    return "application_mismatch";
  }
  if (joined.includes("decision_not_approved") || joined.includes("denied")) return "result_denied";
  if (errors.some((e) => e === "callback_untrusted" || e === "pii_in_callback" || e === "receipt_id_missing")) {
    return "invalid_callback";
  }
  if (errors.some((e) => e === "handoff_unavailable" || e === "handoff_create_failed")) {
    return "temporarily_unavailable";
  }
  if (errors.some((e) => e === "expected_content_hash_required" || e === "return_url_invalid")) {
    return "invalid_request";
  }
  return "receipt_invalid";
}

export interface CreateVerificationRequestContext {
  partnerId: string;
  policyId: string;
  environment: "sandbox" | "production";
  baseUrl?: string;
  appSlug?: string;
  applicationId?: string;
  apiKey?: string;
  policyPackId?: string;
  bindingId?: string;
  fetchFn?: typeof fetch;
}

export async function createVerificationRequestForKit(
  ctx: CreateVerificationRequestContext,
  input: CreateVerificationRequestInput,
): Promise<VerificationRequestResult> {
  const mode = input.mode ?? (ctx.apiKey && ctx.applicationId ? "hosted_handoff" : "redirect");
  const capabilities = resolvePolicyIntegrationCapabilities({
    policyPackId: ctx.policyPackId,
    policyId: ctx.policyId,
  });
  const capabilityCheck = validateVerificationRequestCapabilities(capabilities, {
    expectedContentHash: input.expectedContentHash,
  });
  if (!capabilityCheck.ok) {
    return { ok: false, category: capabilityCheck.category, errors: capabilityCheck.errors };
  }

  let returnUrl = input.returnUrl.trim();
  try {
    const parsed = new URL(returnUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return { ok: false, category: "invalid_request", errors: ["return_url_invalid"] };
    }
  } catch {
    return { ok: false, category: "invalid_request", errors: ["return_url_invalid"] };
  }

  if (input.partnerState?.trim()) {
    try {
      returnUrl = embedPartnerStateInReturnUrl(returnUrl, input.partnerState);
    } catch {
      return { ok: false, category: "invalid_request", errors: ["invalid_partner_state"] };
    }
  }

  if (mode === "hosted_handoff") {
    if (!ctx.apiKey?.startsWith("abx_")) {
      return { ok: false, category: "invalid_request", errors: ["api_key_required"] };
    }
    if (!ctx.applicationId) {
      return { ok: false, category: "invalid_request", errors: ["application_id_required"] };
    }
    const fetchFn = ctx.fetchFn ?? fetch;
    const base = (ctx.baseUrl ?? "").replace(/\/$/, "") || "https://abraxasworld.xyz";
    try {
      const res = await fetchFn(`${base}/api/v1/partner-handoff`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${ctx.apiKey}`,
          "content-type": "application/json",
          "x-abraxas-application-id": ctx.applicationId,
        },
        body: JSON.stringify({
          runtime: "universal_https",
          binding_id: input.bindingId ?? ctx.bindingId,
        }),
      });
      if (res.status === 429) {
        return { ok: false, category: "rate_limited", errors: ["rate_limited"] };
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        const code = body.error ?? "handoff_create_failed";
        if (code === "production_not_activated") {
          return { ok: false, category: "invalid_request", errors: [code] };
        }
        return { ok: false, category: "temporarily_unavailable", errors: [code] };
      }
      const data = (await res.json()) as {
        hosted_url?: string;
        verify_request?: string;
        handoff_ref?: string;
        expires_at?: string;
      };
      if (!data.hosted_url || !data.verify_request) {
        return { ok: false, category: "temporarily_unavailable", errors: ["handoff_unavailable"] };
      }
      void emitRequestCreatedTelemetry(ctx, data.verify_request, "hosted_handoff");
      return {
        ok: true,
        request_id: data.verify_request,
        verification_url: data.hosted_url,
        expires_at: data.expires_at ?? null,
        mode: "hosted_handoff",
        handoff_ref: data.handoff_ref,
      };
    } catch {
      return { ok: false, category: "temporarily_unavailable", errors: ["handoff_create_failed"] };
    }
  }

  let requestId = input.requestId?.trim() ?? "";
  if (requestId && !requestId.startsWith(PARTNER_REQUEST_ID_PREFIX) && !isOpaqueVerifyRequest(requestId)) {
    return { ok: false, category: "invalid_request", errors: ["invalid_request_id"] };
  }
  if (!requestId) {
    const binding = issuePartnerRequestCorrelation({
      partnerId: ctx.partnerId,
      policyId: ctx.policyId,
      purpose: input.purpose,
      callbackNormalized: returnUrl,
      environment: ctx.environment,
    });
    requestId = binding.requestId;
  }
  const boundReturnUrl = embedRequestIdInReturnUrl(returnUrl, requestId);
  const verificationUrl = buildPartnerFlowEntryUrl({
    partnerId: ctx.partnerId,
    policyId: ctx.policyId,
    returnUrl: boundReturnUrl,
    origin: ctx.baseUrl,
    purpose: input.purpose,
    expectedContentHash: input.expectedContentHash,
    appSlug: ctx.appSlug,
  });
  void emitRequestCreatedTelemetry(ctx, requestId, "redirect");
  return {
    ok: true,
    request_id: requestId,
    verification_url: verificationUrl,
    expires_at: null,
    mode: "redirect",
  };
}

async function emitRequestCreatedTelemetry(
  ctx: CreateVerificationRequestContext,
  requestId: string,
  mode: VerificationRequestMode,
): Promise<void> {
  if (!ctx.applicationId) return;
  try {
    const { recordIntegrationEventBestEffort } = await import("@/lib/partner/integrationObservability/record");
    await recordIntegrationEventBestEffort({
      partnerId: ctx.partnerId,
      applicationId: ctx.applicationId,
      environment: ctx.environment,
      eventType: "verification_request_created",
      lifecycleStage: "request",
      requestId,
      policyId: ctx.policyId,
      metadata: { public_code: mode },
    });
  } catch {
    // Telemetry must never affect request creation.
  }
}

export async function verifyCallbackWithNarrowResultForKit(
  kit: {
    parseCallback: (search: URLSearchParams | Record<string, string | string[] | undefined>) => {
      ok: boolean;
      params?: { receipt_id?: string; request_id?: string | null };
      errors?: string[];
    };
    verifyForAction: (input: {
      receiptId: string;
      expectedRequestId?: string;
      callbackRequestId?: string | null;
    }) => Promise<PartnerKitSafeResult>;
    fetchNarrowPartnerResult: (receiptId: string) => Promise<
      { ok: true; result: NarrowPartnerResult } | { ok: false; errors: string[] }
    >;
  },
  input: VerifyCallbackWithNarrowResultInput,
): Promise<VerifyCallbackWithNarrowResultResult> {
  const parsed = kit.parseCallback(input.search);
  if (!parsed.ok) {
    const errors = parsed.errors;
    return {
      ok: false,
      verification: null,
      narrow: null,
      category: categorizeIntegrationErrors(errors),
      errors,
    };
  }
  const receiptId = parsed.params.receipt_id;
  if (!receiptId) {
    const errors = ["receipt_id_missing"];
    return {
      ok: false,
      verification: null,
      narrow: null,
      category: "invalid_callback",
      errors,
    };
  }

  const verification = await kit.verifyForAction({
    receiptId,
    expectedRequestId: input.expectedRequestId,
    callbackRequestId: parsed.params.request_id,
  });

  if (!verificationPermitsAction(verification)) {
    const errors = [...verification.errors];
    if (verification.outcome === "expired") errors.push("receipt_expired");
    if (verification.outcome === "revoked") errors.push("receipt_revoked");
    return {
      ok: false,
      verification,
      narrow: null,
      category: categorizeIntegrationErrors(errors.length ? errors : [verification.outcome]),
      errors,
    };
  }

  const narrowFetched = await kit.fetchNarrowPartnerResult(receiptId);
  if (!narrowFetched.ok) {
    return {
      ok: false,
      verification,
      narrow: null,
      category: categorizeIntegrationErrors(narrowFetched.errors),
      errors: narrowFetched.errors,
    };
  }
  if (narrowFetched.result.decision !== "approved") {
    return {
      ok: false,
      verification,
      narrow: narrowFetched.result,
      category: "result_denied",
      errors: ["result_denied"],
    };
  }

  void emitCallbackVerifiedTelemetry(verification, receiptId);

  return {
    ok: true,
    verification,
    narrow: narrowFetched.result,
    category: null,
    errors: [],
  };
}

async function emitCallbackVerifiedTelemetry(
  verification: PartnerKitSafeResult,
  receiptId: string,
): Promise<void> {
  if (!verification.partner_id || !verification.policy_id) return;
  try {
    const { recordIntegrationEventBestEffort } = await import("@/lib/partner/integrationObservability/record");
    await recordIntegrationEventBestEffort({
      partnerId: verification.partner_id,
      environment: verification.production_usable ? "production" : "sandbox",
      eventType: "receipt_verification_succeeded",
      lifecycleStage: "verification",
      receiptId,
      policyId: verification.policy_id,
      outcome: verification.outcome,
    });
  } catch {
    // Best effort only.
  }
}

export function isUniversalRequestId(value: string): boolean {
  return value.startsWith(PARTNER_REQUEST_ID_PREFIX) || value.startsWith(PARTNER_VERIFY_REQUEST_PREFIX);
}
