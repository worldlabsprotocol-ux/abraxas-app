// FILE: examples/partner-access-nextjs-starter/lib/config.ts
// Operator-supplied env — no Good Trouble defaults, no API keys in browser.

import {
  buildReferenceVerifyUrl,
  REFERENCE_RP_ENV_KEYS,
  resolveReferenceRelyingPartyConfig,
  validatePartnerReturnUrlFormat,
  type ReferenceRelyingPartyConfig,
} from "@/lib/partner/referenceRelyingPartyConfig";

export const STARTER_ENV_KEYS = {
  ...REFERENCE_RP_ENV_KEYS,
  sessionSecret: "PARTNER_ACCESS_STARTER_SESSION_SECRET",
  allowSandbox: "PARTNER_ACCESS_STARTER_ALLOW_SANDBOX",
} as const;

export interface StarterConfigResult {
  config: ReferenceRelyingPartyConfig | null;
  missing: string[];
  returnUrlErrors: string[];
  sessionSecret: string | null;
  allowSandbox: boolean;
}

export function resolveStarterConfig(
  env: Record<string, string | undefined> = process.env,
): StarterConfigResult {
  const resolved = resolveReferenceRelyingPartyConfig(env);
  const sessionSecret = env[STARTER_ENV_KEYS.sessionSecret]?.trim() || null;
  const allowSandbox = env[STARTER_ENV_KEYS.allowSandbox]?.trim() === "true";

  let returnUrlErrors: string[] = [];
  if (resolved.config) {
    const format = validatePartnerReturnUrlFormat(resolved.config.returnUrl);
    returnUrlErrors = format.errors;
  }

  return {
    config: resolved.config,
    missing: resolved.missing,
    returnUrlErrors,
    sessionSecret,
    allowSandbox,
  };
}

export function buildStarterVerifyUrl(config: ReferenceRelyingPartyConfig): string {
  return buildReferenceVerifyUrl(config);
}

export function isStarterConfigured(env: Record<string, string | undefined> = process.env): boolean {
  const { config, missing, returnUrlErrors, sessionSecret } = resolveStarterConfig(env);
  return Boolean(config && missing.length === 0 && returnUrlErrors.length === 0 && sessionSecret);
}
