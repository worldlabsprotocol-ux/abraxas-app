// FILE: lib/partner/integrationKit/trustAnchorPinConfig.ts
// Load integrator trust anchor pins from env or JSON files (out-of-band distribution).

import type { TrustAnchorBundleV1 } from "@abraxas/independent-verifier";
import { validateTrustAnchorBundle } from "@abraxas/independent-verifier";

export function parseIntegratorTrustAnchorJson(raw: string): TrustAnchorBundleV1 {
  const parsed = JSON.parse(raw) as TrustAnchorBundleV1;
  const validated = validateTrustAnchorBundle(parsed);
  if (!validated.ok) {
    throw new Error(`integrator_trust_anchor_invalid:${validated.reason}`);
  }
  return parsed;
}

/** Server-side: `ABRAXAS_INTEGRATOR_TRUST_ANCHOR_JSON` or path in `ABRAXAS_INTEGRATOR_TRUST_ANCHOR_PATH`. */
export async function loadIntegratorTrustAnchorFromEnv(
  env: Record<string, string | undefined> = process.env,
): Promise<TrustAnchorBundleV1 | null> {
  const inline = env.ABRAXAS_INTEGRATOR_TRUST_ANCHOR_JSON?.trim();
  if (inline) return parseIntegratorTrustAnchorJson(inline);

  const path = env.ABRAXAS_INTEGRATOR_TRUST_ANCHOR_PATH?.trim();
  if (!path) return null;

  const { readFile } = await import("node:fs/promises");
  const raw = await readFile(path, "utf8");
  return parseIntegratorTrustAnchorJson(raw);
}
