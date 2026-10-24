// FILE: lib/partner/hostedHandoff/holderOrigin.ts
// Holder continue URLs must match the deployment that persisted the verify_request (never hardcoded production).

import { normalizePublicOrigin } from "@/lib/app/publicAppOrigin";
import { CANONICAL_PRODUCTION_ORIGIN } from "@/lib/integrationReadiness";
import { resolveHolderFacingApiOrigin } from "@/lib/product/canonicalProductOrigin";
import { isPublicDemoRuntime, PUBLIC_DEMO_ORIGIN } from "@/lib/product/publicOrigin";

export function resolveHostedHandoffHolderOrigin(
  env: Record<string, string | undefined> = process.env,
): string {
  return resolveHolderFacingApiOrigin(env);
}

export function buildHostedHandoffContinueUrl(
  verifyRequest: string,
  env: Record<string, string | undefined> = process.env,
): string {
  const origin = resolveHostedHandoffHolderOrigin(env).replace(/\/$/, "");
  return `${origin}/partner/continue?verify_request=${encodeURIComponent(verifyRequest)}`;
}

export type HostedHandoffOriginGateResult =
  | { ok: true; origin: string }
  | { ok: false; code: "holder_origin_mismatch" | "holder_origin_unconfigured"; operator_message: string };

/**
 * Fail closed before issuing a holder link when deployment origin cannot match persisted records.
 */
export function evaluateHostedHandoffHolderOriginGate(
  env: Record<string, string | undefined> = process.env,
): HostedHandoffOriginGateResult {
  const origin = resolveHostedHandoffHolderOrigin(env);
  let normalized: string;
  try {
    normalized = normalizePublicOrigin(origin);
  } catch {
    return {
      ok: false,
      code: "holder_origin_unconfigured",
      operator_message:
        "This deployment has no valid public app origin. Set NEXT_PUBLIC_APP_URL to the host that serves holder verification for this environment.",
    };
  }

  if (isPublicDemoRuntime(env)) {
    const demo = normalizePublicOrigin(PUBLIC_DEMO_ORIGIN);
    if (normalized !== demo) {
      return {
        ok: false,
        code: "holder_origin_mismatch",
        operator_message:
          "Demo Launchpad must issue holder links on demo.abraxasworld.xyz (same database as this request). Fix NEXT_PUBLIC_APP_URL or deployment routing — do not send holders to Production.",
      };
    }
    return { ok: true, origin: normalized };
  }

  const production = normalizePublicOrigin(CANONICAL_PRODUCTION_ORIGIN);
  if (normalized === normalizePublicOrigin(PUBLIC_DEMO_ORIGIN)) {
    return {
      ok: false,
      code: "holder_origin_mismatch",
      operator_message:
        "Production Launchpad cannot issue holder links on the Demo origin. Point NEXT_PUBLIC_APP_URL at abraxasworld.xyz for this deployment.",
    };
  }

  if (
    env.ABRAXAS_RUNTIME_ENV?.trim() === "production"
    && normalized !== production
    && !env.VERCEL_URL?.trim()
  ) {
    return {
      ok: false,
      code: "holder_origin_mismatch",
      operator_message:
        "Production runtime must issue holder links on abraxasworld.xyz so requests resolve against the Production database.",
    };
  }

  return { ok: true, origin: normalized };
}
