// FILE: examples/partner-access-nextjs-starter/lib/config.ts
// Starter-specific env only — never reads generic PARTNER_FLOW_RP_* production variables.

import { validatePartnerReturnUrlFormat } from "@/lib/partner/referenceRelyingPartyConfig";
import { SITE_URL } from "@/lib/siteUrl";
import { isStarterRuntimeEnabled } from "./runtimeGate";

/** Starter-only env keys — isolated from live Abraxas PARTNER_FLOW_RP_* runtime config. */
export const STARTER_ENV_KEYS = {
  enabled: "PARTNER_ACCESS_STARTER_ENABLED",
  partnerId: "PARTNER_ACCESS_STARTER_PARTNER_ID",
  policyId: "PARTNER_ACCESS_STARTER_POLICY_ID",
  returnUrl: "PARTNER_ACCESS_STARTER_RETURN_URL",
  abraxasBaseUrl: "PARTNER_ACCESS_STARTER_ABRAXAS_BASE_URL",
  displayName: "PARTNER_ACCESS_STARTER_DISPLAY_NAME",
  sessionSecret: "PARTNER_ACCESS_STARTER_SESSION_SECRET",
  allowSandbox: "PARTNER_ACCESS_STARTER_ALLOW_SANDBOX",
} as const;

export interface StarterPartnerConfig {
  partnerId: string;
  policyId: string;
  abraxasBaseUrl: string;
  resourceUrl: string;
  returnUrl: string;
  displayName: string;
}

export interface StarterConfigResult {
  enabled: boolean;
  config: StarterPartnerConfig | null;
  missing: string[];
  returnUrlErrors: string[];
  sessionSecret: string | null;
  allowSandbox: boolean;
}

function normalizeBaseUrl(raw: string | undefined): string {
  return (raw ?? "").trim().replace(/\/$/, "");
}

export function resolveStarterConfig(
  env: Record<string, string | undefined> = process.env,
): StarterConfigResult {
  const enabled = isStarterRuntimeEnabled(env);
  if (!enabled) {
    return {
      enabled: false,
      config: null,
      missing: [],
      returnUrlErrors: [],
      sessionSecret: null,
      allowSandbox: false,
    };
  }

  const missing: string[] = [];
  const partnerId = env[STARTER_ENV_KEYS.partnerId]?.trim() ?? "";
  const policyId = env[STARTER_ENV_KEYS.policyId]?.trim() ?? "";
  const returnUrl = env[STARTER_ENV_KEYS.returnUrl]?.trim() ?? "";
  const sessionSecret = env[STARTER_ENV_KEYS.sessionSecret]?.trim() || null;
  const allowSandbox = env[STARTER_ENV_KEYS.allowSandbox]?.trim() === "true";

  if (!partnerId) missing.push(STARTER_ENV_KEYS.partnerId);
  if (!policyId) missing.push(STARTER_ENV_KEYS.policyId);
  if (!returnUrl) missing.push(STARTER_ENV_KEYS.returnUrl);
  if (!sessionSecret) missing.push(STARTER_ENV_KEYS.sessionSecret);

  let returnUrlErrors: string[] = [];
  if (returnUrl) {
    const format = validatePartnerReturnUrlFormat(returnUrl);
    returnUrlErrors = format.errors;
  }

  if (missing.length > 0 || returnUrlErrors.length > 0) {
    return {
      enabled: true,
      config: null,
      missing,
      returnUrlErrors,
      sessionSecret,
      allowSandbox,
    };
  }

  const abraxasBaseUrl = normalizeBaseUrl(env[STARTER_ENV_KEYS.abraxasBaseUrl]) || SITE_URL;
  const displayName = env[STARTER_ENV_KEYS.displayName]?.trim() || `Partner ${partnerId}`;

  return {
    enabled: true,
    config: {
      partnerId,
      policyId,
      abraxasBaseUrl,
      returnUrl,
      displayName,
      resourceUrl: returnUrl,
    },
    missing: [],
    returnUrlErrors: [],
    sessionSecret,
    allowSandbox,
  };
}

export function buildStarterVerifyUrl(config: StarterPartnerConfig): string {
  const params = new URLSearchParams({
    partner_id: config.partnerId,
    policy_id: config.policyId,
    return_url: config.returnUrl,
  });
  return `${config.abraxasBaseUrl}/partner/verify?${params.toString()}`;
}

export function isStarterConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const resolved = resolveStarterConfig(env);
  return resolved.enabled
    && resolved.config !== null
    && resolved.missing.length === 0
    && resolved.returnUrlErrors.length === 0
    && Boolean(resolved.sessionSecret);
}
