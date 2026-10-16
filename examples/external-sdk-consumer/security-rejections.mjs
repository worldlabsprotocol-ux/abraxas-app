/**
 * SYNTHETIC security rejection matrix — clean-room SDK only (Build #591).
 * Does not weaken verification; asserts fail-closed behavior on isolated fixtures.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  resolveInstitutionalTrustEnv,
  inspectSignedDecisionReceipt,
  verifySignedDecisionReceipt,
} from "@abraxas/institutional-verification";
import { FileReceiptConsumptionStore } from "@abraxas/institutional-verification/consumption";
import {
  loadSyntheticSignedReceipt,
  loadSyntheticTrustRegistryJson,
  loadSyntheticDigestPin,
  SYNTHETIC_PARTNER_ID,
  SYNTHETIC_POLICY_ID,
  SYNTHETIC_FIXTURE_NOW_ISO,
  SYNTHETIC_FIXTURE_NOTICE,
} from "@abraxas/institutional-verification/fixtures/synthetic";

console.log(SYNTHETIC_FIXTURE_NOTICE);

const REJECTED_VERDICTS = new Set(["invalid", "blocked"]);

/**
 * @param {string} label
 * @param {import("@abraxas/institutional-verification").InstitutionalReceiptVerificationResult} result
 * @param {{ rejection_reasons?: string[] }} [expect]
 */
function assertSdkRejected(label, result, expect = {}) {
  if (result.authorize === true) {
    throw new Error(`${label}: expected rejection, authorize=true`);
  }
  if (!REJECTED_VERDICTS.has(result.verdict)) {
    throw new Error(
      `${label}: expected verdict invalid|blocked, got ${JSON.stringify({
        verdict: result.verdict,
        authorize: result.authorize,
        reasons: result.rejection_reasons,
      })}`,
    );
  }
  for (const reason of expect.rejection_reasons ?? []) {
    if (!result.rejection_reasons?.includes(reason)) {
      throw new Error(
        `${label}: expected rejection_reason ${reason}, got ${JSON.stringify(result.rejection_reasons)}`,
      );
    }
  }
}

/**
 * @param {string} label
 * @param {() => Promise<import("@abraxas/institutional-verification").InstitutionalReceiptVerificationResult>} run
 * @param {{ rejection_reasons?: string[] }} [expect]
 */
async function expectSdkRejection(label, run, expect = {}) {
  try {
    const result = await run();
    assertSdkRejected(label, result, expect);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith(`${label}:`)) {
      throw err;
    }
    const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    throw new Error(
      `${label}: unexpected runtime error (expected structured SDK rejection, not throw): ${detail}`,
      { cause: err },
    );
  }
}

const receipt = loadSyntheticSignedReceipt();
const registryJson = loadSyntheticTrustRegistryJson();
const nowValid = new Date(SYNTHETIC_FIXTURE_NOW_ISO);
const nowExpired = new Date("2028-07-01T00:00:00.000Z");

const trustOk = await resolveInstitutionalTrustEnv({
  receipt_verification_registry_json: registryJson,
});
if (!trustOk.ok) throw new Error(`baseline trust failed: ${trustOk.ok === false ? trustOk.code : "unknown"}`);

const scope = { partner_id: SYNTHETIC_PARTNER_ID, policy_id: SYNTHETIC_POLICY_ID };

function freshStoreDir() {
  return mkdtempSync(join(tmpdir(), "abraxas-rp-security-"));
}

// Wrong policy
assertSdkRejected(
  "wrong_policy",
  await inspectSignedDecisionReceipt({
    signed_record: receipt,
    relying_party: { partner_id: SYNTHETIC_PARTNER_ID, policy_id: "wrong-policy-id" },
    request_id: "rej_wrong_policy",
    trust_env: trustOk.env,
    now: nowValid,
  }),
);

// Wrong partner (cross-tenant binding)
assertSdkRejected(
  "wrong_partner",
  await inspectSignedDecisionReceipt({
    signed_record: receipt,
    relying_party: { partner_id: "other-partner-tenant", policy_id: SYNTHETIC_POLICY_ID },
    request_id: "rej_wrong_partner",
    trust_env: trustOk.env,
    now: nowValid,
  }),
);

// Untrusted issuer (signing key not in registry)
const untrustedReceipt = structuredClone(receipt);
untrustedReceipt.signing_key_id = "unknown-signing-key";
assertSdkRejected(
  "untrusted_issuer",
  await inspectSignedDecisionReceipt({
    signed_record: untrustedReceipt,
    relying_party: scope,
    request_id: "rej_untrusted",
    trust_env: trustOk.env,
    now: nowValid,
  }),
);

// Invalid trust digest pin
const trustBadPin = await resolveInstitutionalTrustEnv({
  receipt_verification_registry_json: registryJson,
  pinned_receipt_key_document_digest: "0".repeat(64),
});
if (!trustBadPin.ok) {
  const code = trustBadPin.code ?? "unknown";
  if (
    code !== "trust_material_pin_mismatch"
    && code !== "trust_material_inconsistent"
    && code !== "pin_mismatch"
  ) {
    throw new Error(`unexpected trust pin failure code: ${code}`);
  }
  console.log("invalid_trust_digest: blocked at trust resolve (" + code + ")");
} else {
  assertSdkRejected(
    "invalid_trust_digest",
    await inspectSignedDecisionReceipt({
      signed_record: receipt,
      relying_party: scope,
      request_id: "rej_bad_digest",
      trust_env: trustBadPin.env,
      now: nowValid,
    }),
  );
}

// Malformed receipt — documented malformed_input contract (missing receipt id)
await expectSdkRejection(
  "malformed_receipt",
  () =>
    inspectSignedDecisionReceipt({
      signed_record: {},
      relying_party: scope,
      request_id: "rej_malformed",
      trust_env: trustOk.env,
      now: nowValid,
    }),
  { rejection_reasons: ["malformed_input"] },
);

// Expired (fixture validity window)
assertSdkRejected(
  "expired_receipt",
  await inspectSignedDecisionReceipt({
    signed_record: receipt,
    relying_party: scope,
    request_id: "rej_expired",
    trust_env: trustOk.env,
    now: nowExpired,
  }),
  { rejection_reasons: ["expired"] },
);

// Revoked — documented SDK path: authenticated revocation feed status (not receipt tampering)
const tmpRevoked = freshStoreDir();
try {
  const revokedStore = new FileReceiptConsumptionStore(tmpRevoked);
  await expectSdkRejection(
    "revoked_receipt",
    () =>
      verifySignedDecisionReceipt({
        signed_record: receipt,
        relying_party: scope,
        request_id: "rej_revoked",
        trust_env: trustOk.env,
        consumption_store: revokedStore,
        revocation_source: { available: true, status: "revoked" },
        now: nowValid,
      }),
    { rejection_reasons: ["revoked"] },
  );
} finally {
  rmSync(tmpRevoked, { recursive: true, force: true });
}

// Authorize path requires revocation evidence when unavailable
const tmpNoRev = freshStoreDir();
try {
  const store = new FileReceiptConsumptionStore(tmpNoRev);
  const noRevocation = await verifySignedDecisionReceipt({
    signed_record: receipt,
    relying_party: scope,
    request_id: "rej_no_revocation",
    trust_env: trustOk.env,
    consumption_store: store,
    revocation_source: { available: false },
    now: nowValid,
  });
  assertSdkRejected("revocation_unavailable", noRevocation, {
    rejection_reasons: ["revocation_unavailable"],
  });
} finally {
  rmSync(tmpNoRev, { recursive: true, force: true });
}

// Lightweight { status: "stale" } is NOT part of RevocationSourceState (active | revoked | unknown).
const tmpInvalidRevHint = freshStoreDir();
try {
  const invalidHintStore = new FileReceiptConsumptionStore(tmpInvalidRevHint);
  const invalidRevocationHint = await verifySignedDecisionReceipt({
    signed_record: receipt,
    relying_party: scope,
    request_id: "rej_invalid_revocation_hint",
    trust_env: trustOk.env,
    consumption_store: invalidHintStore,
    revocation_source: { available: true, status: "stale" },
    now: nowValid,
  });
  assertSdkRejected("invalid_revocation_hint", invalidRevocationHint, {
    rejection_reasons: ["revocation_unavailable"],
  });
} finally {
  rmSync(tmpInvalidRevHint, { recursive: true, force: true });
}

console.log(
  "portable_revocation_stale: COVERAGE_GAP — authenticated stale portable revocation snapshots are exercised in lib/institutionalVerification/build586.adversarial.test.ts (not shipped in synthetic clean-room fixtures).",
);

const tmpReplay = freshStoreDir();
try {
  const store = new FileReceiptConsumptionStore(tmpReplay);
  const authorized = await verifySignedDecisionReceipt({
    signed_record: receipt,
    relying_party: scope,
    request_id: "rej_auth_once",
    trust_env: trustOk.env,
    consumption_store: store,
    revocation_source: { available: true, status: "active" },
    now: nowValid,
  });
  if (!authorized.authorize) {
    throw new Error(`baseline authorize failed: ${authorized.rejection_reasons?.join(",")}`);
  }

  const replay = await verifySignedDecisionReceipt({
    signed_record: receipt,
    relying_party: scope,
    request_id: "rej_replay",
    trust_env: trustOk.env,
    consumption_store: store,
    revocation_source: { available: true, status: "active" },
    now: nowValid,
  });
  assertSdkRejected("duplicate_consumption", replay, { rejection_reasons: ["replay_detected"] });
} finally {
  rmSync(tmpReplay, { recursive: true, force: true });
}

console.log("external-sdk-consumer security-rejections OK (synthetic fixtures only)");
console.log("digest pin sample (for integrators):", loadSyntheticDigestPin().slice(0, 16) + "…");
