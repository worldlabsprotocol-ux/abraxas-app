// FILE: lib/partner/partnerKeyIssuance.ts
// Shared partner API key issuance helpers for admin routes and UI.

import type { PartnerScope } from "@/lib/partner/partnerAuth";

export const LEGACY_VERIFY_DEFAULT_SCOPES: PartnerScope[] = [
  "verify:credential",
  "verify:registry",
];

export const PARTNER_SCOPE_OPTIONS: ReadonlyArray<{
  scope: PartnerScope;
  label: string;
  description: string;
}> = [
  {
    scope: "verify:credential",
    label: "verify:credential",
    description: "POST /api/credentials/verify",
  },
  {
    scope: "verify:registry",
    label: "verify:registry",
    description: "Registry lookup APIs",
  },
  {
    scope: "verify:requests",
    label: "verify:requests",
    description: "Verification request APIs",
  },
  {
    scope: "verify:screening",
    label: "verify:screening",
    description: "Screening APIs",
  },
  {
    scope: "metering:read",
    label: "metering:read",
    description: "Partner metering read APIs",
  },
  {
    scope: "webhooks:read",
    label: "webhooks:read",
    description: "Webhook delivery history and sandbox test enqueue",
  },
];

const KNOWN_SCOPES = new Set<PartnerScope>(
  PARTNER_SCOPE_OPTIONS.map((option) => option.scope),
);

export const WEBHOOK_SANDBOX_SCOPE_PRESET: PartnerScope[] = ["webhooks:read"];

export const VERIFY_API_SCOPE_PRESET: PartnerScope[] = [...LEGACY_VERIFY_DEFAULT_SCOPES];

export function partnerAllowsProductionKeys(allowedEnvironments: readonly string[]): boolean {
  return allowedEnvironments.includes("production");
}

export function resolveIssuanceEnvironment(
  requested?: "live" | "test",
): "live" | "test" {
  return requested ?? "test";
}

export type NormalizePartnerKeyScopesResult =
  | { ok: true; scopes: PartnerScope[]; usedLegacyDefault: boolean }
  | { ok: false; error: string };

export function normalizePartnerKeyScopes(
  scopes: readonly string[] | undefined,
  options?: { scopesProvided?: boolean },
): NormalizePartnerKeyScopesResult {
  const scopesProvided = options?.scopesProvided ?? scopes !== undefined;

  if (!scopesProvided) {
    return {
      ok: true,
      scopes: [...LEGACY_VERIFY_DEFAULT_SCOPES],
      usedLegacyDefault: true,
    };
  }

  if (!Array.isArray(scopes) || scopes.length === 0) {
    return { ok: false, error: "scopes must be a non-empty array when provided" };
  }

  const deduped: PartnerScope[] = [];
  for (const scope of scopes) {
    if (!KNOWN_SCOPES.has(scope as PartnerScope)) {
      return { ok: false, error: `Unknown scope: ${scope}` };
    }
    const normalized = scope as PartnerScope;
    if (!deduped.includes(normalized)) {
      deduped.push(normalized);
    }
  }

  return { ok: true, scopes: deduped, usedLegacyDefault: false };
}
