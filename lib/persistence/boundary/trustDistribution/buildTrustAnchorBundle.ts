// FILE: lib/persistence/boundary/trustDistribution/buildTrustAnchorBundle.ts

import {
  TRUST_ANCHOR_BUNDLE_DOCUMENT,
  TRUST_ANCHOR_BUNDLE_SCHEMA_VERSION,
  type TrustAnchorBundleV1,
  publicEd25519JwkFingerprint,
} from "@abraxas/independent-verifier";

export function buildTrustAnchorBundleV1(input: {
  anchorKeyId: string;
  anchorPublicJwk: JsonWebKey;
  environment: "demo" | "production";
  effectiveFrom?: string;
  statementCacheMaxAgeSeconds?: number;
  minimumRegistryVersionHint?: number | null;
}): TrustAnchorBundleV1 {
  const fingerprint = publicEd25519JwkFingerprint(input.anchorPublicJwk);
  if (!fingerprint) throw new Error("invalid_anchor_public_jwk");
  return {
    document: TRUST_ANCHOR_BUNDLE_DOCUMENT,
    schema_version: TRUST_ANCHOR_BUNDLE_SCHEMA_VERSION,
    anchor_key_id: input.anchorKeyId,
    public_jwk: input.anchorPublicJwk,
    public_key_fingerprint: fingerprint,
    environment: input.environment,
    effective_from: input.effectiveFrom ?? new Date().toISOString(),
    distribution: "out_of_band",
    statement_cache_max_age_seconds: input.statementCacheMaxAgeSeconds ?? 86_400,
    minimum_registry_version_hint: input.minimumRegistryVersionHint ?? null,
  };
}
