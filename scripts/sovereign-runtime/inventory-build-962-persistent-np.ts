#!/usr/bin/env npx tsx
/**
 * BUILD #962 — redacted persistent NP inventory (read-only, no secrets).
 */
import {
  buildPersistentNpInstitutionalInventory,
  summarizePersistentNpActivationTier,
} from "../../lib/sovereignRuntime/persistentNpInstitutionalInventory";

const inventory = buildPersistentNpInstitutionalInventory(process.env);
const tier = summarizePersistentNpActivationTier(inventory);

console.log(
  JSON.stringify(
    {
      build: 962,
      agent_host: "not_authoritative_persistent_host",
      commit_hint: process.env.ABRAXAS_BUILD_962_SOURCE_COMMIT?.trim() ?? null,
      inventory,
      activation_tier: tier,
      notes: [
        "Run on founder-controlled Linux host with EnvironmentFile — not the Cursor cloud agent VM.",
        "Software self-hosted custody is not hardware non-exportable.",
        "Persistent operational GO requires live ceremony evidence, not this inventory alone.",
      ],
    },
    null,
    2,
  ),
);

if (process.env.ABRAXAS_BUILD_962_STRICT === "1" && tier.tier === "BLOCKED") {
  process.exit(1);
}
process.exit(0);