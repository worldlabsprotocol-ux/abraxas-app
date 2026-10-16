/**
 * SYNTHETIC smoke test — runs from a clean npm project with only @abraxas/institutional-verification installed.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  resolveInstitutionalTrustEnv,
  inspectSignedDecisionReceipt,
  verifySignedDecisionReceipt,
  RECEIPT_TRUST_DIGEST_VERSION,
} from "@abraxas/institutional-verification";
import { FileReceiptConsumptionStore } from "@abraxas/institutional-verification/consumption";
import {
  loadSyntheticSignedReceipt,
  loadSyntheticTrustRegistryJson,
  SYNTHETIC_PARTNER_ID,
  SYNTHETIC_POLICY_ID,
  SYNTHETIC_FIXTURE_NOW_ISO,
  SYNTHETIC_FIXTURE_NOTICE,
} from "@abraxas/institutional-verification/fixtures/synthetic";

console.log(SYNTHETIC_FIXTURE_NOTICE);
console.log("digest version", RECEIPT_TRUST_DIGEST_VERSION);

const signed_record = loadSyntheticSignedReceipt();
const trust = await resolveInstitutionalTrustEnv({
  receipt_verification_registry_json: loadSyntheticTrustRegistryJson(),
});
if (!trust.ok) throw new Error(`trust failed: ${trust.code}`);

const inspected = await inspectSignedDecisionReceipt({
  signed_record,
  relying_party: { partner_id: SYNTHETIC_PARTNER_ID, policy_id: SYNTHETIC_POLICY_ID },
  request_id: "external_smoke_inspect",
  trust_env: trust.env,
  now: new Date(SYNTHETIC_FIXTURE_NOW_ISO),
});
if (inspected.authorize !== false || !inspected.underlying.cryptographically_authentic) {
  throw new Error(
    `inspect unexpected: ${JSON.stringify({
      authorize: inspected.authorize,
      verdict: inspected.verdict,
      authentic: inspected.underlying.cryptographically_authentic,
    })}`,
  );
}

const wrongPolicy = await inspectSignedDecisionReceipt({
  signed_record,
  relying_party: { partner_id: SYNTHETIC_PARTNER_ID, policy_id: "wrong-policy" },
  request_id: "external_smoke_wrong_policy",
  trust_env: trust.env,
  now: new Date(SYNTHETIC_FIXTURE_NOW_ISO),
});
if (wrongPolicy.verdict === "valid") throw new Error("wrong policy should not validate");

const tmp = mkdtempSync(join(tmpdir(), "abraxas-rp-replay-"));
try {
  const store = new FileReceiptConsumptionStore(tmp);
  const observedAt = SYNTHETIC_FIXTURE_NOW_ISO;
  const revocation_source = { available: true, status: "active" };
  const authorized = await verifySignedDecisionReceipt({
    signed_record,
    relying_party: { partner_id: SYNTHETIC_PARTNER_ID, policy_id: SYNTHETIC_POLICY_ID },
    request_id: "external_smoke_auth_1",
    trust_env: trust.env,
    consumption_store: store,
    revocation_source,
    now: new Date(SYNTHETIC_FIXTURE_NOW_ISO),
  });
  if (!authorized.authorize) throw new Error(`authorize failed: ${authorized.rejection_reasons.join(",")}`);

  const replay = await verifySignedDecisionReceipt({
    signed_record,
    relying_party: { partner_id: SYNTHETIC_PARTNER_ID, policy_id: SYNTHETIC_POLICY_ID },
    request_id: "external_smoke_auth_2",
    trust_env: trust.env,
    consumption_store: store,
    revocation_source,
    now: new Date(SYNTHETIC_FIXTURE_NOW_ISO),
  });
  if (replay.authorize) throw new Error("replay should be denied");
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log("external-sdk-consumer smoke OK");
