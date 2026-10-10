// FILE: lib/partner/universalIntegration/liveReceiptCorrelation.ts
// Correlate live sandbox receipt proof without exposing holder data.

import { readFileSync } from "node:fs";
import { parsePartnerCallbackParams } from "@/lib/partner/integrationKit/callback";
import type { ReferenceRelyingPartyConfig } from "@/lib/partner/referenceRelyingPartyConfig";
import { LIVE_SANDBOX_ENV_KEYS } from "./liveSandboxExecution";
import { STAGING_LIVE_E2E_ENV_KEYS } from "./stagingConfigContract";

export const LIVE_E2E_ARTIFACT_SCHEMA_VERSION = 1 as const;

export interface ExampleMerchantLiveE2eArtifact {
  schema_version: typeof LIVE_E2E_ARTIFACT_SCHEMA_VERSION;
  captured_at: string;
  environment: "sandbox";
  partner_id: string;
  policy_id: string;
  application_id?: string | null;
  verification_request_id?: string | null;
  correlation_id?: string | null;
  receipt_id: string;
  proof_source: "playwright_callback" | "manual_callback" | "operator_env";
}

export interface ResolvedLiveReceiptCorrelation {
  receipt_id: string;
  verification_request_id: string | null;
  correlation_id: string | null;
  application_id: string | null;
  source: "artifact" | "callback_url" | "receipt_id_env";
  proof_source: ExampleMerchantLiveE2eArtifact["proof_source"] | "operator_env";
}

export type ResolveLiveReceiptCorrelationResult =
  | { ok: true; correlation: ResolvedLiveReceiptCorrelation }
  | { ok: false; errors: string[] };

function loadArtifact(path: string): ExampleMerchantLiveE2eArtifact | null {
  try {
    const raw = readFileSync(path, "utf8");
    const parsed = JSON.parse(raw) as Partial<ExampleMerchantLiveE2eArtifact>;
    if (parsed.schema_version !== LIVE_E2E_ARTIFACT_SCHEMA_VERSION) return null;
    if (!parsed.receipt_id?.trim() || !parsed.partner_id?.trim() || !parsed.policy_id?.trim()) {
      return null;
    }
    if (parsed.environment !== "sandbox") return null;
    return parsed as ExampleMerchantLiveE2eArtifact;
  } catch {
    return null;
  }
}

function bindTenant(
  config: ReferenceRelyingPartyConfig,
  input: {
    partner_id: string;
    policy_id: string;
    receipt_id: string;
    verification_request_id?: string | null;
    correlation_id?: string | null;
    application_id?: string | null;
    source: ResolvedLiveReceiptCorrelation["source"];
    proof_source: ResolvedLiveReceiptCorrelation["proof_source"];
  },
): ResolveLiveReceiptCorrelationResult {
  const errors: string[] = [];
  if (input.partner_id !== config.partnerId) errors.push("partner_id_mismatch");
  if (input.policy_id !== config.policyId) errors.push("policy_id_mismatch");
  if (!input.receipt_id.startsWith("dr_")) errors.push("receipt_id_format_invalid");
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    correlation: {
      receipt_id: input.receipt_id,
      verification_request_id: input.verification_request_id?.trim() || null,
      correlation_id: input.correlation_id?.trim()
        || input.verification_request_id?.trim()
        || null,
      application_id: input.application_id?.trim() || null,
      source: input.source,
      proof_source: input.proof_source,
    },
  };
}

export function resolveLiveReceiptCorrelation(input: {
  config: ReferenceRelyingPartyConfig;
  env?: Record<string, string | undefined>;
}): ResolveLiveReceiptCorrelationResult {
  const env = input.env ?? process.env;
  const errors: string[] = [];

  const artifactPath = env[STAGING_LIVE_E2E_ENV_KEYS.artifactPath]?.trim()
    || "reports/example-merchant-live-e2e-artifact.json";
  const artifact = loadArtifact(artifactPath);
  if (artifact) {
    return bindTenant(input.config, {
      partner_id: artifact.partner_id,
      policy_id: artifact.policy_id,
      receipt_id: artifact.receipt_id,
      verification_request_id: artifact.verification_request_id,
      correlation_id: artifact.correlation_id,
      application_id: artifact.application_id,
      source: "artifact",
      proof_source: artifact.proof_source,
    });
  }

  const callbackUrl = env[STAGING_LIVE_E2E_ENV_KEYS.callbackCaptureUrl]?.trim() ?? "";
  if (callbackUrl) {
    let search: URLSearchParams;
    try {
      search = new URL(callbackUrl).searchParams;
    } catch {
      return { ok: false, errors: ["callback_capture_url_invalid"] };
    }
    const parsed = parsePartnerCallbackParams(search);
    if (!parsed.ok) {
      return { ok: false, errors: parsed.errors.map((e) => `callback_${e}`) };
    }
    return bindTenant(input.config, {
      partner_id: parsed.params.partner_id ?? input.config.partnerId,
      policy_id: parsed.params.policy_id ?? input.config.policyId,
      receipt_id: parsed.params.receipt_id!,
      verification_request_id: parsed.params.request_id,
      correlation_id: parsed.params.request_id,
      application_id: null,
      source: "callback_url",
      proof_source: "manual_callback",
    });
  }

  const receiptId = env[LIVE_SANDBOX_ENV_KEYS.liveReceiptId]?.trim() ?? "";
  if (receiptId) {
    return bindTenant(input.config, {
      partner_id: input.config.partnerId,
      policy_id: input.config.policyId,
      receipt_id: receiptId,
      verification_request_id: null,
      correlation_id: null,
      application_id: env[STAGING_LIVE_E2E_ENV_KEYS.launchpadApplicationId]?.trim() || null,
      source: "receipt_id_env",
      proof_source: "operator_env",
    });
  }

  errors.push("live_receipt_correlation_missing");
  errors.push("set_artifact_or_callback_url_or_receipt_id_env");
  return { ok: false, errors };
}
