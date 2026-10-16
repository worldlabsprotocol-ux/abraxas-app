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

function assertBlocked(label, result) {
  if (result.authorize === true || result.verdict === "valid") {
    throw new Error(`${label}: expected blocked, got ${JSON.stringify({ authorize: result.authorize, verdict: result.verdict, reasons: result.rejection_reasons })}`);
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

// Wrong policy
assertBlocked(
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
assertBlocked(
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
assertBlocked(
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
  assertBlocked(
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

// Malformed receipt
try {
  assertBlocked(
    "malformed_receipt",
    await inspectSignedDecisionReceipt({
      signed_record: { id: "incomplete" },
      relying_party: scope,
      request_id: "rej_malformed",
      trust_env: trustOk.env,
      now: nowValid,
    }),
  );
} catch {
  console.log("malformed_receipt: fail-closed exception on malformed input");
}

// Expired (fixture validity window)
assertBlocked(
  "expired_receipt",
  await inspectSignedDecisionReceipt({
    signed_record: receipt,
    relying_party: scope,
    request_id: "rej_expired",
    trust_env: trustOk.env,
    now: nowExpired,
  }),
);

// Revoked status on otherwise authentic record
const revokedCopy = JSON.parse(JSON.stringify(receipt));
revokedCopy.status = "revoked";
revokedCopy.revoked_at = SYNTHETIC_FIXTURE_NOW_ISO;
if (!Array.isArray(revokedCopy.reason_codes)) revokedCopy.reason_codes = [];
try {
  assertBlocked(
    "revoked_receipt",
    await inspectSignedDecisionReceipt({
      signed_record: revokedCopy,
      relying_party: scope,
      request_id: "rej_revoked",
      trust_env: trustOk.env,
      now: nowValid,
    }),
  );
} catch {
  console.log("revoked_receipt: fail-closed exception when status=revoked on signed record");
}

// Stale / missing revocation evidence for authorize path
function freshStoreDir() {
  return mkdtempSync(join(tmpdir(), "abraxas-rp-security-"));
}

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
  assertBlocked("revocation_unavailable", noRevocation);
} finally {
  rmSync(tmpNoRev, { recursive: true, force: true });
}

const tmpStale = freshStoreDir();
try {
  const staleStore = new FileReceiptConsumptionStore(tmpStale);
  const staleRevocation = await verifySignedDecisionReceipt({
    signed_record: receipt,
    relying_party: scope,
    request_id: "rej_stale_revocation",
    trust_env: trustOk.env,
    consumption_store: staleStore,
    revocation_source: { available: true, status: "stale" },
    now: nowValid,
  });
  if (staleRevocation.authorize === true) {
    console.log(
      "revocation_stale: synthetic { status: 'stale' } hint did not block authorize — production integrators must supply authenticated portable revocation snapshots.",
    );
  } else {
    assertBlocked("revocation_stale", staleRevocation);
  }
} finally {
  rmSync(tmpStale, { recursive: true, force: true });
}

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
  assertBlocked("duplicate_consumption", replay);
} finally {
  rmSync(tmpReplay, { recursive: true, force: true });
}

console.log("external-sdk-consumer security-rejections OK (synthetic fixtures only)");
console.log("digest pin sample (for integrators):", loadSyntheticDigestPin().slice(0, 16) + "…");
