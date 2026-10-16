/**
 * CommonJS entry — verifies package exports.require path.
 */
const {
  resolveInstitutionalTrustEnv,
  RECEIPT_TRUST_DIGEST_VERSION,
} = require("@abraxas/institutional-verification");
const { FileReceiptConsumptionStore } = require("@abraxas/institutional-verification/consumption");
const {
  loadSyntheticTrustRegistryJson,
  SYNTHETIC_FIXTURE_NOTICE,
} = require("@abraxas/institutional-verification/fixtures/synthetic");

async function main() {
  if (RECEIPT_TRUST_DIGEST_VERSION !== 2) throw new Error("unexpected digest version");
  const trust = await resolveInstitutionalTrustEnv({
    receipt_verification_registry_json: loadSyntheticTrustRegistryJson(),
  });
  if (!trust.ok) throw new Error(trust.code);
  if (typeof FileReceiptConsumptionStore !== "function") throw new Error("missing store export");
  console.log(SYNTHETIC_FIXTURE_NOTICE.slice(0, 40) + "…");
  console.log("external-sdk-consumer CJS smoke OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
