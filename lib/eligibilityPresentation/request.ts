// FILE: lib/eligibilityPresentation/request.ts

import { randomBytes } from "node:crypto";
import { SITE_URL } from "@/lib/siteUrl";
import {
  ELIGIBILITY_PRESENTATION_ENVIRONMENTS,
  ELIGIBILITY_PRESENTATION_TTL_MS,
} from "./contract";
import { audienceHash, nonceHash, opaqueRequestRef, partnerHmac, purposeClass } from "./opaque";
import { presentationRequestOverride } from "./safety";
import { findRequestByNonceHash, savePresentationRequest } from "./store";
import type { EligibilityPresentationRequestRecord } from "./types";

export const CREATE_REQUEST_KEYS = [
  "policy_id",
  "policy_version",
  "purpose",
  "action",
  "action_scope",
  "environment",
  "result_category",
  "verifier_nonce",
  "expires_at",
] as const;

export interface CreatePresentationRequestInput {
  partnerId: string;
  policy_id: string;
  policy_version: number;
  purpose: string;
  action: string;
  action_scope: string;
  environment: "sandbox" | "production";
  result_category: string;
  verifier_nonce: string;
  expires_at?: string;
}

export function parseCreateRequestBody(
  body: unknown,
): Omit<CreatePresentationRequestInput, "partnerId"> | { error: string } {
  if (presentationRequestOverride(body, CREATE_REQUEST_KEYS)) return { error: "invalid_input" };
  const record = body as Record<string, unknown>;
  const policy_id = typeof record.policy_id === "string" ? record.policy_id.trim() : "";
  const policy_version = Number(record.policy_version);
  const purpose = typeof record.purpose === "string" ? purposeClass(record.purpose) : "";
  const action = typeof record.action === "string" ? record.action.trim() : "";
  const action_scope = typeof record.action_scope === "string" ? record.action_scope.trim() : "";
  const environment = record.environment;
  const result_category = typeof record.result_category === "string" ? record.result_category.trim() : "";
  const verifier_nonce = typeof record.verifier_nonce === "string" ? record.verifier_nonce.trim() : "";
  if (!policy_id || !Number.isInteger(policy_version) || policy_version < 1) return { error: "invalid_policy" };
  if (!purpose || !action || !action_scope || !result_category || verifier_nonce.length < 8) {
    return { error: "invalid_input" };
  }
  if (
    typeof environment !== "string" ||
    !(ELIGIBILITY_PRESENTATION_ENVIRONMENTS as readonly string[]).includes(environment)
  ) {
    return { error: "invalid_environment" };
  }
  return {
    policy_id,
    policy_version,
    purpose,
    action,
    action_scope,
    environment: environment as "sandbox" | "production",
    result_category,
    verifier_nonce,
    expires_at: typeof record.expires_at === "string" ? record.expires_at : undefined,
  };
}

export async function createPresentationRequest(
  input: CreatePresentationRequestInput,
): Promise<EligibilityPresentationRequestRecord> {
  const hash = nonceHash(input.verifier_nonce);
  const existing = await findRequestByNonceHash(hash);
  if (existing) {
    throw Object.assign(new Error("replayed"), { code: "replayed" });
  }
  const now = Date.now();
  const expires = input.expires_at ? Date.parse(input.expires_at) : now + ELIGIBILITY_PRESENTATION_TTL_MS;
  if (Number.isNaN(expires) || expires <= now) {
    throw Object.assign(new Error("invalid_expiry"), { code: "invalid_expiry" });
  }
  const { bindFreshConsentToOperatorSandboxResult } = await import(
    "@/lib/partner/sandboxInstitutionalOperatorResult/bindConsent"
  );
  await bindFreshConsentToOperatorSandboxResult({
    partnerId: input.partnerId,
    policyId: input.policy_id,
    policyVersion: input.policy_version,
    action: input.action,
    actionScope: input.action_scope,
    environment: input.environment,
  });
  const record: EligibilityPresentationRequestRecord = {
    request_ref: opaqueRequestRef(`${input.partnerId}:${randomBytes(8).toString("hex")}`),
    partner_hmac: partnerHmac(input.partnerId),
    audience_hash: audienceHash(input.partnerId),
    policy_id: input.policy_id,
    policy_version: input.policy_version,
    purpose: input.purpose,
    action: input.action,
    action_scope: input.action_scope,
    environment: input.environment,
    result_category: input.result_category,
    nonce_hash: hash,
    status: "created",
    expires_at: new Date(expires).toISOString(),
    issued_at: new Date(now).toISOString(),
    presentation_ref: null,
    source_receipt_id: null,
    holder_session_hmac: null,
    consent_bound: false,
    revoked_at: null,
    consumed_at: null,
  };
  return savePresentationRequest(record);
}

export function hostedFlowUrl(input: { partnerId: string; policyId: string; requestRef: string }): string {
  const base = SITE_URL.replace(/\/$/, "");
  const params = new URLSearchParams({
    partner_id: input.partnerId,
    policy_id: input.policyId,
  });
  return `${base}/partner/verify?${params.toString()}`;
}
