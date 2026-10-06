import { createHash, randomBytes } from "node:crypto";

export const PARTNER_REQUEST_ID_PREFIX = "req_" as const;
export const PARTNER_VERIFY_REQUEST_PREFIX = "vr_" as const;

export function isOpaqueVerifyRequest(value: string): boolean {
  return value.startsWith(PARTNER_VERIFY_REQUEST_PREFIX) && value.length >= 12;
}

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

/** TEST/LOCAL ONLY — legacy vitest correlation store. Production must use PartnerRequestStateStore. */
const LEGACY_TEST_STORE = new Map<string, PartnerRequestCorrelationBinding>();

export function resetPartnerRequestCorrelationForTests(): void {
  LEGACY_TEST_STORE.clear();
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
  LEGACY_TEST_STORE.set(requestId, binding);
  return binding;
}

function peekPartnerRequestCorrelation(requestId: string): PartnerRequestCorrelationBinding | null {
  const binding = LEGACY_TEST_STORE.get(requestId.trim());
  if (!binding) return null;
  if (new Date(binding.expiresAt).getTime() <= Date.now()) {
    LEGACY_TEST_STORE.delete(requestId);
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
