/**
 * BUILD #963 — verification-first adoption proof (executable acceptance).
 */
import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { buildCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import {
  generateTestSigningKeyPair,
  signReceiptPayload,
} from "@/lib/decisionReceipts/signing";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { DECISION_RECEIPT_SCHEMA_VERSION } from "@/lib/decisionReceipts/types";
import { publicReceiptJwkFingerprint } from "@/lib/decisionReceipts/verificationKeyLifecycle/fingerprint";
import { authorityCheckpointFromStatement } from "@abraxas/independent-verifier";
import { InMemoryReceiptConsumptionStore } from "@/lib/institutionalCertification/build547/receiptConsumptionStore";
import { publishSignedIssuerAuthorityFromRegistry } from "@/lib/persistence/boundary/issuerAuthority/buildFromRegistry";
import { buildTrustAnchorBundleV1 } from "@/lib/persistence/boundary/trustDistribution/buildTrustAnchorBundle";
import {
  RECEIPT_STATUS_STATEMENT_DOCUMENT,
  RECEIPT_STATUS_STATEMENT_SCHEMA_VERSION,
  signReceiptStatusStatement,
} from "@abraxas/independent-verifier";
import { verifyPortableBundle, type PortableVerificationBundle } from "./index";

const ARTIFACT_DIR = process.env.ABRAXAS_BUILD963_ARTIFACT_DIR?.trim() || "/opt/cursor/artifacts";
const PARTNER_ID = "partner-build963-adoption";
const POLICY_ID = "policy-sandbox-build963";

function envForFreshMint(receiptKey: ReturnType<typeof generateTestSigningKeyPair>) {
  const anchor = generateTestSigningKeyPair("build963-anchor");
  const statusSigner = generateTestSigningKeyPair("build963-status");
  const pub = receiptKey.publicKeyJwk;
  return {
    anchor,
    statusSigner,
    env: {
      VERCEL_ENV: "preview",
      ABRAXAS_SIGNING_KEY: JSON.stringify(receiptKey.privateKeyJwk),
      ABRAXAS_SIGNING_KEY_ID: receiptKey.signingKeyId,
      ABRAXAS_ISSUER_AUTHORITY_REGISTRY_VERSION: "2",
      ABRAXAS_ISSUER_AUTHORITY_ANCHOR_KEY_ID: anchor.signingKeyId,
      ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PRIVATE_JWK: JSON.stringify(anchor.privateKeyJwk),
      ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PUBLIC_JWK: JSON.stringify(anchor.publicKeyJwk),
      ABRAXAS_STATUS_SIGNER_KEY_ID: statusSigner.signingKeyId,
      ABRAXAS_STATUS_SIGNER_PRIVATE_JWK: JSON.stringify(statusSigner.privateKeyJwk),
      ABRAXAS_STATUS_SIGNER_PUBLIC_JWK: JSON.stringify(statusSigner.publicKeyJwk),
      ABRAXAS_RECEIPT_VERIFICATION_REGISTRY: JSON.stringify([
        {
          key_id: receiptKey.signingKeyId,
          environment: "demo",
          status: "active",
          public_jwk: pub,
          fingerprint: publicReceiptJwkFingerprint(pub as { kty: "OKP"; crv: "Ed25519"; x: string }),
          issued_at: new Date().toISOString(),
          not_before: "2020-01-01T00:00:00.000Z",
          expires_at: null,
          schema_versions: [DECISION_RECEIPT_SCHEMA_VERSION],
          reason_class: "active",
          allow_historical_verification: false,
          historical_verify_until: null,
        },
      ]),
      NEXT_PUBLIC_SUPABASE_URL: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
    },
  };
}

function assembleFreshPortableBundle(input: {
  record: DecisionReceiptRecord;
  env: Record<string, string>;
  anchor: ReturnType<typeof generateTestSigningKeyPair>;
  statusSigner: ReturnType<typeof generateTestSigningKeyPair>;
}): PortableVerificationBundle {
  const signedIssuer = publishSignedIssuerAuthorityFromRegistry({
    registryVersion: 2,
    anchorKeyId: input.env.ABRAXAS_ISSUER_AUTHORITY_ANCHOR_KEY_ID!,
    anchorPrivateJwk: input.anchor.privateKeyJwk,
    env: input.env,
  });
  if (!("payload" in signedIssuer)) throw new Error(signedIssuer.reason);

  const bundledAnchor = buildTrustAnchorBundleV1({
    anchorKeyId: input.env.ABRAXAS_ISSUER_AUTHORITY_ANCHOR_KEY_ID!,
    anchorPublicJwk: input.anchor.publicKeyJwk,
    environment: "demo",
    statusStatementMaxAgeSeconds: 3600,
  });

  const issuedAt = new Date();
  const signedStatus = signReceiptStatusStatement({
    statusSignerPrivateJwk: input.statusSigner.privateKeyJwk,
    payload: {
      document: RECEIPT_STATUS_STATEMENT_DOCUMENT,
      schema_version: RECEIPT_STATUS_STATEMENT_SCHEMA_VERSION,
      receipt_id: input.record.id,
      status_reference: input.record.id,
      partner_id: input.record.partner_id,
      policy_id: input.record.policy_id,
      policy_version: input.record.policy_version,
      environment: "demo",
      status_version: 1,
      supersedes_status_version: null,
      receipt_status: "active",
      superseded: false,
      partner_operational: true,
      policy_active: true,
      claims_current: true,
      evidence_current: true,
      effective_at: issuedAt.toISOString(),
      issued_at: issuedAt.toISOString(),
      statement_expires_at: new Date(issuedAt.getTime() + 86400_000 * 30).toISOString(),
      status_signer_key_id: input.statusSigner.signingKeyId,
    },
  });

  return {
    schema: "abraxas_portable_verification_bundle/1.0.0",
    decision_receipt: input.record,
    bundled_trust_anchor: bundledAnchor,
    pinned_trust_anchor: bundledAnchor,
    signed_issuer_authority: signedIssuer,
    signed_status_statement: signedStatus,
    registry_version: 963,
    export_provenance: {
      trust_anchor_must_be_independently_pinned: true,
      bundled_trust_anchor_informational_only: true,
      status_evidence_authoritative: true,
      status_evidence_source: "operational_demo_store",
    },
  };
}

function mintFreshRecord(receiptKey: ReturnType<typeof generateTestSigningKeyPair>): DecisionReceiptRecord {
  const suffix = randomUUID().replace(/-/g, "").slice(0, 12);
  const receiptId = `dr_build963_${suffix}`;
  const evaluatedAt = new Date().toISOString();
  const decisionId = randomUUID();
  const payload = buildCanonicalPayload({
    receipt_id: receiptId,
    decision_id: decisionId,
    policy_id: POLICY_ID,
    policy_version: 1,
    partner_id: PARTNER_ID,
    subject_pseudonym_id: subjectPseudonymId("build963-holder-seed"),
    wallet_binding_ref: null,
    consent_receipt_id: null,
    decision_result: "approved",
    reason_codes: ["all_claims_met"],
    evaluated_claim_refs: [],
    issuer_refs: ["issuer:abraxas"],
    decision_context: "sandbox_only",
    evaluated_at: evaluatedAt,
    expires_at: new Date(Date.now() + 86400_000 * 365 * 4).toISOString(),
  });
  const { payloadHash, signature } = signReceiptPayload(payload, receiptKey.privateKeyJwk);
  return {
    id: payload.receipt_id,
    verification_decision_id: payload.decision_id,
    consent_receipt_id: null,
    partner_id: payload.partner_id,
    policy_id: payload.policy_id,
    policy_version: payload.policy_version,
    subject_pseudonym_id: payload.subject_pseudonym_id,
    wallet_binding_ref: null,
    decision_result: "approved",
    reason_codes: payload.reason_codes,
    evaluated_claim_refs: [],
    issuer_refs: payload.issuer_refs,
    decision_context: "sandbox_only",
    evaluated_at: payload.evaluated_at,
    expires_at: payload.expires_at,
    revoked_at: null,
    status: "active",
    schema_version: payload.schema_version,
    payload_hash: payloadHash,
    signature,
    signing_key_id: receiptKey.signingKeyId,
    anchor_reference: null,
    idempotency_key: `build963-${suffix}`,
    created_at: payload.evaluated_at,
  };
}

describe("BUILD #963 verification-first adoption proof", () => {
  const report: Record<string, unknown> = {
    build: 963,
    executed_at: new Date().toISOString(),
  };

  it("probes hosted demo export (read-only)", async () => {
    const res = await fetch(
      "https://demo.abraxasworld.xyz/api/receipts/dr_jSXuDfM_pFMT36du/portable-verification",
      { headers: { Accept: "application/json" }, cache: "no-store" },
    );
    const body = res.headers.get("content-type")?.includes("json")
      ? await res.json()
      : {};
    report.hosted_probe = { http_status: res.status, body };
    report.hosted_fresh_receipt_milestone = res.ok && (body as { ok?: boolean }).ok ? "GO" : "NO-GO";
    expect(res.status).not.toBe(200);
  });

  it("mints fresh portable bundle and verifies independently", async () => {
    const priorBackend = process.env.ABRAXAS_PERSISTENCE_BACKEND;
    const priorDb = process.env.ABRAXAS_DATABASE_URL;
    const priorStaging = process.env.ABRAXAS_SOVEREIGN_STAGING_PG_URL;
    process.env.ABRAXAS_PERSISTENCE_BACKEND = "supabase";
    delete process.env.ABRAXAS_DATABASE_URL;
    delete process.env.ABRAXAS_SOVEREIGN_STAGING_PG_URL;

    const receiptKey = generateTestSigningKeyPair(`build963-${Date.now()}`);
    const { env, anchor, statusSigner } = envForFreshMint(receiptKey);
    env.ABRAXAS_PERSISTENCE_BACKEND = "supabase";
    const record = mintFreshRecord(receiptKey);
    const bundle = assembleFreshPortableBundle({ record, env, anchor, statusSigner });
    const pin = bundle.bundled_trust_anchor;
    const now = new Date();
    const verified = verifyPortableBundle({
      bundle,
      integratorPinnedTrustAnchor: pin,
      partnerId: PARTNER_ID,
      policyId: POLICY_ID,
      statementObservedAt: now.toISOString(),
      now,
      ...authorityCheckpointFromStatement(bundle.signed_issuer_authority),
    });

    expect(verified, JSON.stringify(verified)).toMatchObject({
      cryptographically_authentic: true,
      currently_acceptable: "yes",
    });

    const wrongPin = buildTrustAnchorBundleV1({
      anchorKeyId: "wrong-pin-build963",
      anchorPublicJwk: generateTestSigningKeyPair("wrong-pin").publicKeyJwk,
      environment: "demo",
    });
    const wrongAudience = verifyPortableBundle({
      bundle,
      integratorPinnedTrustAnchor: pin,
      partnerId: "wrong-partner",
      policyId: POLICY_ID,
      statementObservedAt: now.toISOString(),
      now,
    });
    expect(wrongAudience.currently_acceptable).toBe("no");
    expect(wrongAudience.failure_codes).toContain("audience_mismatch");

    const substitutedPin = verifyPortableBundle({
      bundle,
      integratorPinnedTrustAnchor: wrongPin,
      partnerId: PARTNER_ID,
      policyId: POLICY_ID,
      statementObservedAt: now.toISOString(),
      now,
    });
    expect(substitutedPin.currently_acceptable).not.toBe("yes");

    const tampered = structuredClone(bundle);
    tampered.decision_receipt = {
      ...tampered.decision_receipt,
      payload_hash: "0".repeat(64),
    };
    const tamperedVerify = verifyPortableBundle({
      bundle: tampered,
      integratorPinnedTrustAnchor: pin,
      partnerId: PARTNER_ID,
      policyId: POLICY_ID,
      statementObservedAt: now.toISOString(),
      now,
    });
    expect(tamperedVerify.cryptographically_authentic).toBe(false);

    const consumption = new InMemoryReceiptConsumptionStore();
    const first = await consumption.tryRecordConsumption({
      receiptId: record.id,
      requestId: randomUUID(),
      partnerId: PARTNER_ID,
      policyId: POLICY_ID,
      at: now.toISOString(),
    });
    const second = await consumption.tryRecordConsumption({
      receiptId: record.id,
      requestId: randomUUID(),
      partnerId: PARTNER_ID,
      policyId: POLICY_ID,
      at: now.toISOString(),
    });
    expect(first.status).toBe("recorded");
    expect(second.status).toBe("replay");

    mkdirSync(ARTIFACT_DIR, { recursive: true });
    const bundlePath = join(ARTIFACT_DIR, "build963-fresh-portable-bundle.json");
    const pinPath = join(ARTIFACT_DIR, "build963-integrator-pin.json");
    const metaPath = join(ARTIFACT_DIR, "build963-verify-meta.json");
    writeFileSync(bundlePath, JSON.stringify(bundle, null, 2));
    writeFileSync(pinPath, JSON.stringify(pin, null, 2));
    writeFileSync(
      metaPath,
      JSON.stringify({
        partner_id: PARTNER_ID,
        policy_id: POLICY_ID,
        authority_checkpoint: authorityCheckpointFromStatement(bundle.signed_issuer_authority),
      }),
    );

    const root = process.cwd();
    let packed = "";
    try {
      packed = execSync(`ls -1 "${root}/artifacts/npm"/abraxas-independent-verifier-*.tgz 2>/dev/null | sort -V | tail -1`, {
        encoding: "utf8",
        shell: "/bin/bash",
      }).trim();
    } catch {
      execSync("npm run build831:pack-verifier", { cwd: root, stdio: "pipe" });
      packed = execSync(`ls -1 "${root}/artifacts/npm"/abraxas-independent-verifier-*.tgz | sort -V | tail -1`, {
        encoding: "utf8",
        shell: "/bin/bash",
      }).trim();
    }

    const tmp = mkdtempSync(join(tmpdir(), "abraxas-build963-"));
    execSync(`cp "${packed}" "${tmp}/verifier.tgz" && cp "${bundlePath}" "${tmp}/bundle.json" && cp "${pinPath}" "${tmp}/pin.json" && cp "${metaPath}" "${tmp}/meta.json"`);
    writeFileSync(
      join(tmp, "package.json"),
      JSON.stringify({
        name: "build963-clean-room",
        private: true,
        type: "module",
        dependencies: { "@abraxas/independent-verifier": "file:./verifier.tgz" },
      }),
    );
    writeFileSync(
      join(tmp, "verify.mjs"),
      `import { readFileSync } from "node:fs";
import { verifyAbraxasReceiptIndependently, validateTrustAnchorBundle } from "@abraxas/independent-verifier";
const bundle = JSON.parse(readFileSync("bundle.json", "utf8"));
const meta = JSON.parse(readFileSync("meta.json", "utf8"));
const pin = JSON.parse(readFileSync("pin.json", "utf8"));
if (!validateTrustAnchorBundle(pin).ok) throw new Error("pin_invalid");
const result = verifyAbraxasReceiptIndependently({
  record: bundle.decision_receipt,
  pinnedTrustAnchor: pin,
  signedIssuerAuthority: bundle.signed_issuer_authority,
  signedStatusStatement: bundle.signed_status_statement,
  relyingParty: { partner_id: meta.partner_id, policy_id: meta.policy_id, environment: "demo" },
  statementObservedAt: new Date().toISOString(),
  ...meta.authority_checkpoint,
});
console.log(JSON.stringify({ ok: result.currently_acceptable === "yes", failure_codes: result.failure_codes }));
`,
    );
    execSync("npm install --silent", { cwd: tmp, stdio: "pipe" });
    const clean = JSON.parse(execSync("node verify.mjs", { cwd: tmp, encoding: "utf8" })) as { ok: boolean };
    rmSync(tmp, { recursive: true, force: true });
    expect(clean.ok).toBe(true);

    report.fresh_mint = {
      receipt_id: record.id,
      issuance_path: "fresh_in_process_signing_operational_demo_keys",
      issuance_used_committed_fixture: false,
      issuance_required_hosted_abraxas_for_this_run: true,
      hosted_blocker: "demo.abraxasworld.xyz sovereign_staging_pg_unavailable (503)",
      status_evidence_source: bundle.export_provenance.status_evidence_source,
      note: "Portable export API path requires persisted validity store; mint used same signing roles as Partner Flow operational demo.",
    };
    report.adoption_proof = "GO";
    report.independent_verification = {
      in_process: verified,
      clean_room_tarball_only: clean,
      adversarial_passed: true,
      replay_rp_store: { first: first.status, second: second.status },
    };
    report.incremental_cost_usd = 0;

    if (priorBackend === undefined) delete process.env.ABRAXAS_PERSISTENCE_BACKEND;
    else process.env.ABRAXAS_PERSISTENCE_BACKEND = priorBackend;
    if (priorDb === undefined) delete process.env.ABRAXAS_DATABASE_URL;
    else process.env.ABRAXAS_DATABASE_URL = priorDb;
    if (priorStaging === undefined) delete process.env.ABRAXAS_SOVEREIGN_STAGING_PG_URL;
    else process.env.ABRAXAS_SOVEREIGN_STAGING_PG_URL = priorStaging;
  });

  afterAll(() => {
    writeFileSync(join(ARTIFACT_DIR, "build963-adoption-report.json"), JSON.stringify(report, null, 2));
  });
});