// FILE: lib/partner/referenceRelyingPartyConfig.ts
// Generic relying-party integration config — partner-specific values come from env only.

import {
  buildPartnerVerifyUrl,
  resolvePartnerReturnUrl,
  type PartnerIntegrationConfig,
} from "@/lib/partner/referenceIntegration";
import { SITE_URL } from "@/lib/siteUrl";

export const REFERENCE_RP_ENV_KEYS = {
  baseUrl: "PARTNER_FLOW_RP_BASE_URL",
  partnerId: "PARTNER_FLOW_RP_PARTNER_ID",
  policyId: "PARTNER_FLOW_RP_POLICY_ID",
  returnUrl: "PARTNER_FLOW_RP_RETURN_URL",
  displayName: "PARTNER_FLOW_RP_DISPLAY_NAME",
} as const;

export interface ReferenceRelyingPartyConfig {
  baseUrl: string;
  partnerId: string;
  policyId: string;
  returnUrl: string;
  displayName: string;
}

export interface ResolveReferenceRelyingPartyConfigResult {
  config: ReferenceRelyingPartyConfig | null;
  missing: string[];
}

export function normalizeReferenceBaseUrl(raw: string | undefined): string {
  return (raw ?? "").trim().replace(/\/$/, "");
}

export function resolveReferenceRelyingPartyConfig(
  env: Record<string, string | undefined> = process.env,
): ResolveReferenceRelyingPartyConfigResult {
  const missing: string[] = [];
  const partnerId = env[REFERENCE_RP_ENV_KEYS.partnerId]?.trim() ?? "";
  const policyId = env[REFERENCE_RP_ENV_KEYS.policyId]?.trim() ?? "";
  const returnUrl = env[REFERENCE_RP_ENV_KEYS.returnUrl]?.trim() ?? "";

  if (!partnerId) missing.push(REFERENCE_RP_ENV_KEYS.partnerId);
  if (!policyId) missing.push(REFERENCE_RP_ENV_KEYS.policyId);
  if (!returnUrl) missing.push(REFERENCE_RP_ENV_KEYS.returnUrl);

  if (missing.length > 0) {
    return { config: null, missing };
  }

  const baseUrl = normalizeReferenceBaseUrl(env[REFERENCE_RP_ENV_KEYS.baseUrl]) || SITE_URL;
  const displayName =
    env[REFERENCE_RP_ENV_KEYS.displayName]?.trim() || `Partner ${partnerId}`;

  return {
    config: {
      baseUrl,
      partnerId,
      policyId,
      returnUrl,
      displayName,
    },
    missing: [],
  };
}

export function toPartnerIntegrationConfig(
  config: ReferenceRelyingPartyConfig,
): PartnerIntegrationConfig {
  let enterPath = "/callback";
  try {
    enterPath = new URL(config.returnUrl).pathname || "/callback";
  } catch {
    // keep default — validatePartnerReturnUrlFormat will surface format errors
  }

  return {
    partnerId: config.partnerId,
    policyId: config.policyId,
    enterPath,
    displayName: config.displayName,
  };
}

export function buildReferenceVerifyUrl(config: ReferenceRelyingPartyConfig): string {
  const integration = toPartnerIntegrationConfig(config);
  return buildPartnerVerifyUrl(integration, {
    origin: config.baseUrl,
    returnUrl: config.returnUrl,
  });
}

export function resolveReferenceReturnUrl(config: ReferenceRelyingPartyConfig): string {
  return config.returnUrl || resolvePartnerReturnUrl(toPartnerIntegrationConfig(config), config.baseUrl);
}

/** Fail-closed callback URL shape checks (does not probe allowlist). */
export function validatePartnerReturnUrlFormat(returnUrl: string): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const trimmed = returnUrl.trim();

  if (!trimmed) {
    return { ok: false, errors: ["return_url_empty"] };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, errors: ["return_url_not_absolute"] };
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    errors.push(`return_url_unsupported_protocol:${parsed.protocol}`);
  }

  if (parsed.protocol === "http:" && !["localhost", "127.0.0.1"].includes(parsed.hostname)) {
    errors.push("return_url_http_requires_localhost");
  }

  if (!parsed.pathname || parsed.pathname === "/") {
    errors.push("return_url_missing_callback_path");
  }

  if (parsed.search || parsed.hash) {
    errors.push("return_url_must_not_include_query_or_fragment");
  }

  if (trimmed.includes("abraxas-app.vercel.app")) {
    errors.push("return_url_contains_stale_vercel_host");
  }

  return { ok: errors.length === 0, errors };
}
