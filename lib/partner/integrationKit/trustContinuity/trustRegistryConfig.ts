// FILE: lib/partner/integrationKit/trustContinuity/trustRegistryConfig.ts

import {
  validateIntegratorTrustRegistry,
  type IntegratorTrustAnchorRegistryV1,
} from "./integratorAnchorRegistry";

export function parseIntegratorTrustRegistryJson(raw: string): IntegratorTrustAnchorRegistryV1 {
  const parsed = JSON.parse(raw) as IntegratorTrustAnchorRegistryV1;
  const validated = validateIntegratorTrustRegistry(parsed);
  if (!validated.ok) {
    throw new Error(`integrator_trust_registry_invalid:${validated.reason}`);
  }
  return parsed;
}

export async function loadIntegratorTrustRegistryFromEnv(
  env: Record<string, string | undefined> = process.env,
): Promise<IntegratorTrustAnchorRegistryV1 | null> {
  const inline = env.ABRAXAS_INTEGRATOR_TRUST_REGISTRY_JSON?.trim();
  if (inline) return parseIntegratorTrustRegistryJson(inline);

  const path = env.ABRAXAS_INTEGRATOR_TRUST_REGISTRY_PATH?.trim();
  if (!path) return null;

  const { readFile } = await import("node:fs/promises");
  return parseIntegratorTrustRegistryJson(await readFile(path, "utf8"));
}
