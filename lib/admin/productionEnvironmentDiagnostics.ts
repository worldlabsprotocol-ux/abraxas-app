// FILE: lib/admin/productionEnvironmentDiagnostics.ts
// Boolean-only Production signing health + demo isolation checks — no secret material in output.

import { createHash } from "node:crypto";
import { evaluateReceiptSigningHealth } from "@/lib/decisionReceipts/signingKeyDiagnostics";
import { isPartnerSandboxDemoEnabled } from "@/lib/demo/partnerSandboxDemoConfig";
import {
  isProductionAppOrigin,
  resolveConfiguredAppOrigin,
} from "@/lib/demo/partnerSandboxDemoEnvironmentGuard";
import { EXPECTED_DEMO_SIGNING_KEY_THUMBPRINT } from "@/scripts/demo/lib/expectedDemoSigningKeyThumbprint";

export const PRODUCTION_SIGNING_HEALTH_KEYS = new Set([
  "ok",
  "signing_key_configured",
  "signing_key_parse_ok",
  "public_key_configured",
  "public_key_parse_ok",
  "seed_matches_embedded_x",
  "seed_matches_public_env",
  "receipt_env_roundtrip_ok",
  "production_origin_exact",
  "demo_sandbox_flag_disabled",
  "demo_subject_id_unset",
  "signing_key_not_demo_key",
  "browser_session_secret_configured",
] as const);

export type ProductionSigningHealthReport = Record<
  (typeof PRODUCTION_SIGNING_HEALTH_KEYS extends Set<infer K> ? K : never),
  boolean
>;

function canonicalPublicJwkThumbprint(publicJwk: JsonWebKey): string | null {
  if (!publicJwk.kty || !publicJwk.crv || typeof publicJwk.x !== "string" || !publicJwk.x) {
    return null;
  }
  const canonical = JSON.stringify({
    crv: publicJwk.crv,
    kty: publicJwk.kty,
    x: publicJwk.x,
  });
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

function parsePublicJwkFromEnv(
  env: Record<string, string | undefined>,
): JsonWebKey | null {
  const publicRaw = env.ABRAXAS_PUBLIC_KEY?.trim();
  if (publicRaw) {
    try {
      const jwk = JSON.parse(publicRaw) as JsonWebKey;
      if (jwk.kty === "OKP" && jwk.crv === "Ed25519" && typeof jwk.x === "string" && jwk.x) {
        return jwk;
      }
    } catch {
      return null;
    }
  }

  const signingRaw = env.ABRAXAS_SIGNING_KEY?.trim();
  if (!signingRaw) return null;
  try {
    const jwk = JSON.parse(signingRaw) as JsonWebKey;
    if (jwk.kty === "OKP" && jwk.crv === "Ed25519" && typeof jwk.x === "string" && jwk.x) {
      return { kty: jwk.kty, crv: jwk.crv, x: jwk.x };
    }
  } catch {
    return null;
  }
  return null;
}

function evaluateSigningKeyNotDemoKey(env: Record<string, string | undefined>): boolean {
  const expected = EXPECTED_DEMO_SIGNING_KEY_THUMBPRINT?.trim().toLowerCase();
  if (!expected || !/^[0-9a-f]{64}$/.test(expected)) {
    return false;
  }

  const publicJwk = parsePublicJwkFromEnv(env);
  if (!publicJwk) return false;

  const thumbprint = canonicalPublicJwkThumbprint(publicJwk);
  if (!thumbprint) return false;

  return thumbprint.toLowerCase() !== expected;
}

export function evaluateProductionSigningHealth(
  env: Record<string, string | undefined> = process.env,
): ProductionSigningHealthReport {
  const signing = evaluateReceiptSigningHealth(env);
  const configured = resolveConfiguredAppOrigin(env);

  const production_origin_exact = configured !== null && isProductionAppOrigin(configured);
  const demo_sandbox_flag_disabled = !isPartnerSandboxDemoEnabled(env);
  const demo_subject_id_unset = !env.PARTNER_SANDBOX_DEMO_SUBJECT_ID?.trim();
  const signing_key_not_demo_key = evaluateSigningKeyNotDemoKey(env);
  const browser_session_secret_configured = Boolean(env.ABRAXAS_BROWSER_SESSION_SECRET?.trim());

  const report: ProductionSigningHealthReport = {
    ok: false,
    signing_key_configured: signing.signing_key_configured,
    signing_key_parse_ok: signing.signing_key_parse_ok,
    public_key_configured: signing.public_key_configured,
    public_key_parse_ok: signing.public_key_parse_ok,
    seed_matches_embedded_x: signing.seed_matches_embedded_x,
    seed_matches_public_env: signing.seed_matches_public_env,
    receipt_env_roundtrip_ok: signing.receipt_env_roundtrip_ok,
    production_origin_exact,
    demo_sandbox_flag_disabled,
    demo_subject_id_unset,
    signing_key_not_demo_key,
    browser_session_secret_configured,
  };

  report.ok = Object.entries(report)
    .filter(([key]) => key !== "ok")
    .every(([, value]) => value === true);

  return report;
}

export function productionSigningHealthResponseHasNoSecrets(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const record = payload as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== PRODUCTION_SIGNING_HEALTH_KEYS.size) return false;
  for (const key of keys) {
    if (!PRODUCTION_SIGNING_HEALTH_KEYS.has(key as never)) return false;
    if (typeof record[key] !== "boolean") return false;
  }
  return true;
}
