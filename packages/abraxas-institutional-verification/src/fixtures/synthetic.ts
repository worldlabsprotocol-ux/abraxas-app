/**
 * SYNTHETIC TEST FIXTURES ONLY — not production issuer material.
 * Used by external integration examples and smoke tests.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Resolved from package root `fixtures/synthetic` (dist/fixtures → ../..). */
const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "../../fixtures/synthetic");

export const SYNTHETIC_FIXTURE_NOTICE =
  "Synthetic Ed25519 keys and receipts for local SDK smoke tests only. Never use in production.";

export const SYNTHETIC_PARTNER_ID = "institutional-rp-example";
export const SYNTHETIC_POLICY_ID = "institutional-age-21-v1";
export const SYNTHETIC_FIXTURE_NOW_ISO = "2026-06-15T12:00:00.000Z";

export function loadSyntheticTrustRegistryJson(): string {
  return readFileSync(join(fixtureDir, "trust-registry.json"), "utf8");
}

export function loadSyntheticSignedReceipt(): unknown {
  return JSON.parse(readFileSync(join(fixtureDir, "signed-receipt.valid.json"), "utf8"));
}

export function loadSyntheticDigestPin(): string {
  return readFileSync(join(fixtureDir, "trust-digest-v2.txt"), "utf8").trim();
}
