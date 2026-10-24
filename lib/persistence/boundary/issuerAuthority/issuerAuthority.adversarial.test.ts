import { describe, expect, it } from "vitest";
import { generateTestSigningKeyPair, signReceiptPayload } from "@/lib/decisionReceipts/signing";
import { buildCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { DECISION_RECEIPT_SCHEMA_VERSION } from "@/lib/decisionReceipts/types";
import { publicReceiptJwkFingerprint } from "@/lib/decisionReceipts/verificationKeyLifecycle/fingerprint";
import { publishSignedIssuerAuthorityFromRegistry } from "./buildFromRegistry";
import { verifySignedIssuerAuthorityStatement } from "./signVerify";
import { resolveIssuerKeyFromSignedStatement } from "./resolveIssuerKey";
import { evaluateSovereignCurrentValidity } from "../sovereignCurrentValidity/evaluate";

const RECEIPT_KEY = generateTestSigningKeyPair();
const ANCHOR_KEY = generateTestSigningKeyPair();

function registryEnvForReceiptKey(): Record<string, string> {
  const pub = RECEIPT_KEY.publicKeyJwk;
  return {
    ABRAXAS_SIGNING_KEY: JSON.stringify(RECEIPT_KEY.privateKeyJwk),
    ABRAXAS_SIGNING_KEY_ID: RECEIPT_KEY.signingKeyId,
    ABRAXAS_RECEIPT_VERIFICATION_REGISTRY: JSON.stringify([
      {
        key_id: RECEIPT_KEY.signingKeyId,
        environment: "production",
        status: "active",
        public_jwk: pub,
        fingerprint: publicReceiptJwkFingerprint(pub as { kty: "OKP"; crv: "Ed25519"; x: string }),
        issued_at: "2020-01-01T00:00:00.000Z",
        not_before: "2020-01-01T00:00:00.000Z",
        expires_at: null,
        schema_versions: [DECISION_RECEIPT_SCHEMA_VERSION],
        reason_class: "active",
        allow_historical_verification: false,
        historical_verify_until: null,
      },
    ]),
    VERCEL_ENV: "production",
  };
}

function sampleRecord(): DecisionReceiptRecord {
  const payload = buildCanonicalPayload({
    receipt_id: "dr_issuer817",
    decision_id: "00000000-0000-4000-8000-000000008817",
    policy_id: "policy-817",
    policy_version: 1,
    partner_id: "partner-817",
    subject_pseudonym_id: subjectPseudonymId("w-817"),
    wallet_binding_ref: null,
    consent_receipt_id: null,
    decision_result: "approved",
    reason_codes: ["ok"],
    evaluated_claim_refs: [],
    issuer_refs: [],
    decision_context: "production",
    evaluated_at: "2026-06-01T12:00:00.000Z",
    expires_at: "2027-06-01T12:00:00.000Z",
  });
  const { payloadHash, signature } = signReceiptPayload(payload, RECEIPT_KEY.privateKeyJwk);
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
    issuer_refs: [],
    decision_context: "production",
    evaluated_at: payload.evaluated_at,
    expires_at: payload.expires_at,
    revoked_at: null,
    status: "active",
    schema_version: payload.schema_version,
    payload_hash: payloadHash,
    signature,
    signing_key_id: RECEIPT_KEY.signingKeyId,
    anchor_reference: null,
    idempotency_key: null,
    created_at: payload.evaluated_at,
  };
}

function publishStatement(
  env: Record<string, string>,
  registryVersion: number,
  supersedes?: number,
) {
  const signed = publishSignedIssuerAuthorityFromRegistry({
    registryVersion,
    supersedesRegistryVersion: supersedes ?? null,
    anchorKeyId: "anchor-817",
    anchorPrivateJwk: ANCHOR_KEY.privateKeyJwk,
    env,
  });
  if ("ok" in signed && signed.ok === false) throw new Error(signed.reason);
  return signed as Exclude<typeof signed, { ok: false; reason: string }>;
}

describe("signed issuer authority", () => {
  it("rejects forged statement signatures", () => {
    const env = registryEnvForReceiptKey();
    const statement = publishStatement(env, 1);
    const forged = { ...statement, signature: statement.signature.slice(0, -4) + "xxxx" };
    expect(
      verifySignedIssuerAuthorityStatement({
        statement: forged,
        trustAnchorPublicJwk: ANCHOR_KEY.publicKeyJwk,
      }).ok,
    ).toBe(false);
  });

  it("rejects registry version rollback", () => {
    const env = registryEnvForReceiptKey();
    const v2 = publishStatement(env, 2, 1);
    expect(
      verifySignedIssuerAuthorityStatement({
        statement: v2,
        trustAnchorPublicJwk: ANCHOR_KEY.publicKeyJwk,
        minimumRegistryVersion: 3,
      }).ok,
    ).toBe(false);
  });

  it("allows historical signature verify but not current authorization after key revocation in statement", () => {
    const env = registryEnvForReceiptKey();
    const revokedEnv = {
      ...env,
      ABRAXAS_RECEIPT_VERIFICATION_REGISTRY: JSON.stringify([
        {
          ...JSON.parse(env.ABRAXAS_RECEIPT_VERIFICATION_REGISTRY)[0],
          status: "revoked",
          reason_class: "compromise",
          allow_historical_verification: true,
          historical_verify_until: "2099-01-01T00:00:00.000Z",
        },
      ]),
    };
    const statement = publishStatement(revokedEnv, 3, 2);
    const record = sampleRecord();
    const sig = resolveIssuerKeyFromSignedStatement({
      statement,
      trustAnchorPublicJwk: ANCHOR_KEY.publicKeyJwk,
      keyId: record.signing_key_id,
      schemaVersion: record.schema_version,
      environment: "production",
      mode: "signature_verification",
    });
    const auth = resolveIssuerKeyFromSignedStatement({
      statement,
      trustAnchorPublicJwk: ANCHOR_KEY.publicKeyJwk,
      keyId: record.signing_key_id,
      schemaVersion: record.schema_version,
      environment: "production",
      mode: "current_authorization",
    });
    expect(sig.ok).toBe(true);
    expect(auth.ok).toBe(false);
  });

  it("does not trust stale DB issuer row when statement revokes key", async () => {
    const env = registryEnvForReceiptKey();
    const statement = publishStatement(
      {
        ...env,
        ABRAXAS_RECEIPT_VERIFICATION_REGISTRY: JSON.stringify([
          {
            ...JSON.parse(env.ABRAXAS_RECEIPT_VERIFICATION_REGISTRY)[0],
            status: "revoked",
            reason_class: "compromise",
            allow_historical_verification: true,
            historical_verify_until: "2099-01-01T00:00:00.000Z",
          },
        ]),
      },
      4,
      3,
    );
    const result = await evaluateSovereignCurrentValidity({
      record: sampleRecord(),
      signedIssuerAuthority: statement,
      trustAnchorPublicJwk: ANCHOR_KEY.publicKeyJwk,
      expectedEnvironment: "production",
      env: {
        ...env,
        ABRAXAS_SOVEREIGN_STAGING_PG_URL: "postgresql://127.0.0.1:59999/unreachable",
      },
    });
    expect(result.cryptographically_valid).toBe(true);
    expect(result.currently_acceptable).toBe(false);
    expect(result.invalidation_reasons).toContain("issuer_not_authorized");
  });
});
