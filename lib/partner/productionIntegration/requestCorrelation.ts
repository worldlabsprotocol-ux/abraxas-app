// FILE: lib/partner/productionIntegration/requestCorrelation.ts
// Anti-mixup request correlation. Not PII, not a bearer authorization token.

import { createHash, randomBytes } from "node:crypto";
import {
  isOpaqueVerifyRequest as isOpaqueVerifyRequestGuard,
  PARTNER_VERIFY_REQUEST_PREFIX as VERIFY_REQUEST_PREFIX,
} from "@/lib/partner/partnerFlowContinuationIdentifiers";

export const PARTNER_REQUEST_ID_PREFIX = "req_" as const;
export const PARTNER_VERIFY_REQUEST_PREFIX = VERIFY_REQUEST_PREFIX;
export { isOpaqueVerifyRequestGuard as isOpaqueVerifyRequest };

export interface PartnerRequestCorrelationBinding {
  requestId: string;
  partnerId: string;
  policyId: string;
  purpose?: string;
  action?: string;
  callbackNormalized: string;
  environment: "sandbox" | "production";
  issuedAt: string;
  expiresAt: string;
}

const STORE = new Map<string, PartnerRequestCorrelationBinding>();

export function resetPartnerRequestCorrelationForTests(): void {
  STORE.clear();
}

export function issuePartnerRequestCorrelation(input: Omit<PartnerRequestCorrelationBinding, "requestId" | "issuedAt" | "expiresAt"> & {
  ttlMs?: number;
}): PartnerRequestCorrelationBinding {
  const suffix = randomBytes(16).toString("base64url");
  const requestId = `${PARTNER_REQUEST_ID_PREFIX}${suffix}`;
  const now = Date.now();
  const binding: PartnerRequestCorrelationBinding = {
    requestId,
    partnerId: input.partnerId,
    policyId: input.policyId,
    purpose: input.purpose,
    action: input.action,
    callbackNormalized: input.callbackNormalized,
    environment: input.environment,
    issuedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + (input.ttlMs ?? 30 * 60 * 1000)).toISOString(),
  };
  STORE.set(requestId, binding);
  return binding;
}

export function peekPartnerRequestCorrelation(requestId: string): PartnerRequestCorrelationBinding | null {
  const binding = STORE.get(requestId.trim());
  if (!binding) return null;
  if (new Date(binding.expiresAt).getTime() <= Date.now()) {
    STORE.delete(requestId);
    return null;
  }
  return binding;
}

export function validatePartnerRequestCorrelation(input: {
  requestId: string;
  expectedPartnerId: string;
  expectedPolicyId: string;
  expectedEnvironment: "sandbox" | "production";
  expectedPurpose?: string;
  expectedAction?: string;
}): { ok: true; binding: PartnerRequestCorrelationBinding } | { ok: false; errors: string[] } {
  const binding = peekPartnerRequestCorrelation(input.requestId);
  if (!binding) return { ok: false, errors: ["request_correlation_missing"] };
  const errors: string[] = [];
  if (binding.partnerId !== input.expectedPartnerId) errors.push("request_correlation_partner_mismatch");
  if (binding.policyId !== input.expectedPolicyId) errors.push("request_correlation_policy_mismatch");
  if (binding.environment !== input.expectedEnvironment) errors.push("request_correlation_environment_mismatch");
  if (input.expectedPurpose && binding.purpose && binding.purpose !== input.expectedPurpose) {
    errors.push("request_correlation_purpose_mismatch");
  }
  if (input.expectedAction && binding.action && binding.action !== input.expectedAction) {
    errors.push("request_correlation_action_mismatch");
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, binding };
}

export function embedRequestIdInReturnUrl(returnUrl: string, requestId: string): string {
  const url = new URL(returnUrl);
  url.searchParams.set("request_id", requestId);
  return url.toString();
}

export function extractRequestIdFromReturnUrl(returnUrl: string): string | null {
  try {
    return new URL(returnUrl).searchParams.get("request_id")?.trim() || null;
  } catch {
    return null;
  }
}

export function correlationFingerprint(binding: Pick<PartnerRequestCorrelationBinding, "partnerId" | "policyId" | "requestId">): string {
  return createHash("sha256")
    .update(`${binding.partnerId}:${binding.policyId}:${binding.requestId}`)
    .digest("hex")
    .slice(0, 16);
}
