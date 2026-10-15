// FILE: lib/product/canonicalProductOrigin.ts
// Holder-facing API and browser entry origins for the public product (not operator demo hosts).

import { CANONICAL_PRODUCTION_ORIGIN } from "@/lib/integrationReadiness";
import { PUBLIC_DEMO_ORIGIN } from "@/lib/product/publicOrigin";
import { isPublicDemoClientSurface } from "@/lib/product/demoRuntime";

export function resolveHolderFacingApiOrigin(
  env: Record<string, string | undefined> = process.env,
): string {
  const configured = env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  if (isPublicDemoClientSurface(env)) return PUBLIC_DEMO_ORIGIN;
  return CANONICAL_PRODUCTION_ORIGIN;
}

export function resolveChainAttestationSolanaKeysUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  return `${resolveHolderFacingApiOrigin(env)}/api/chain-attestations/verification-keys/solana`;
}

export function resolvePublicProofsPathUrl(
  path: string,
  env: Record<string, string | undefined> = typeof window !== "undefined"
    ? { NEXT_PUBLIC_APP_URL: window.location.origin }
    : process.env,
): string {
  const base = resolveHolderFacingApiOrigin(env);
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}
