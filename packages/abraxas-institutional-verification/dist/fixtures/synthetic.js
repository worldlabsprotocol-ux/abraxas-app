import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// src/fixtures/synthetic.ts
var fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "../../fixtures/synthetic");
var SYNTHETIC_FIXTURE_NOTICE = "Synthetic Ed25519 keys and receipts for local SDK smoke tests only. Never use in production.";
var SYNTHETIC_PARTNER_ID = "institutional-rp-example";
var SYNTHETIC_POLICY_ID = "institutional-age-21-v1";
var SYNTHETIC_FIXTURE_NOW_ISO = "2026-06-15T12:00:00.000Z";
function loadSyntheticTrustRegistryJson() {
  return readFileSync(join(fixtureDir, "trust-registry.json"), "utf8");
}
function loadSyntheticSignedReceipt() {
  return JSON.parse(readFileSync(join(fixtureDir, "signed-receipt.valid.json"), "utf8"));
}
function loadSyntheticDigestPin() {
  return readFileSync(join(fixtureDir, "trust-digest-v2.txt"), "utf8").trim();
}

export { SYNTHETIC_FIXTURE_NOTICE, SYNTHETIC_FIXTURE_NOW_ISO, SYNTHETIC_PARTNER_ID, SYNTHETIC_POLICY_ID, loadSyntheticDigestPin, loadSyntheticSignedReceipt, loadSyntheticTrustRegistryJson };
//# sourceMappingURL=synthetic.js.map
//# sourceMappingURL=synthetic.js.map