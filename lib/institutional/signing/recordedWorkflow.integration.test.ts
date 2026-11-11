import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import nacl from "tweetnacl";
import {
  issuerAuthorityStateDigest,
  verifyEd25519Detached,
  verifySignedReceiptStatusStatement,
} from "@abraxas/independent-verifier";
import { DECISION_RECEIPT_SCHEMA_VERSION, type DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { publicReceiptJwkFingerprint } from "@/lib/decisionReceipts/verificationKeyLifecycle/fingerprint";
import { applySovereignSliceSchema } from "@/lib/persistence/boundary/sovereignSlice/bootstrap";
import { resetSovereignStagingPgPoolForTests } from "@/lib/persistence/boundary/sovereignStagingPg";
import { buildIssuerAuthorityStatementFromRegistry } from "@/lib/persistence/boundary/issuerAuthority/buildFromRegistry";
import {
  describeConfiguredIssuerAuthority,
  hashIssuerAuthorityChangeAuthorization,
  resolveIssuerAuthorityRegistryContinuity,
  verifyIssuerAuthorityChangeAuthorization,
} from "@/lib/persistence/boundary/issuerAuthority/registryContinuity";
import type { SovereignCurrentValidityResult } from "@/lib/persistence/boundary/sovereignCurrentValidity/evaluate";
import { receiptStatusPayloadFromEvaluation } from "@/lib/persistence/boundary/trustDistribution/publishSignedReceiptStatus";
import {
  authorityStateDigest,
  hashAuthorityChangeAuthorization,
} from "./authorityChange";
import type { CustodyClient } from "./contract";
import { openInstitutionalSigner } from "./institutionalSigner";
import {
  approveRecordedAuthorityChange,
  INDEPENDENT_GOVERNANCE_APPROVAL,
  publishAuthoritativeReceiptStatus,
  signRecordedIssuerAuthorityStatement,
} from "./recordedWorkflow";

const PROOF = process.env.ABRAXAS_SOVEREIGN_OPERATIONAL_PROOF === "1";
const describeProof = PROOF ? describe : describe.skip;

type ApprovalInput = Parameters<typeof approveRecordedAuthorityChange>[0];
type RetainedIsAbsent = "retained" extends keyof ApprovalInput ? never : true;
const retainedIsAbsent: RetainedIsAbsent = true;

function custody(key: ReturnType<typeof generateTestSigningKeyPair>, identityId: string, calls: string[]): CustodyClient {
  const pair = nacl.sign.keyPair.fromSeed(Buffer.from(key.privateKeyJwk.d!, "base64url"));
  return {
    identityId,
    keyId: `memory:${identityId}`,
    async getPublicKey() {
      return { keySpec: "ECC_NIST_EDWARDS25519", publicKey: pair.publicKey };
    },
    async signRawDigest(message) {
      calls.push(identityId);
      return nacl.sign.detached(message, pair.secretKey);
    },
  };
}

describe("shared authority document", () => {
  it("uses PR #948's digest and verifies the same change document", async () => {
    expect(retainedIsAbsent).toBe(true);
    expect(INDEPENDENT_GOVERNANCE_APPROVAL.implemented).toBe(false);
    const anchor = generateTestSigningKeyPair("shared-anchor");
    const receipt = generateTestSigningKeyPair("shared-receipt");
    const payload = {
      document: "abraxas_issuer_authority_statement" as const,
      schema_version: "1.0.0" as const,
      registry_version: 854,
      supersedes_registry_version: null,
      environment: "demo" as const,
      issued_at: "2026-06-01T00:00:00.000Z",
      not_before: "2020-01-01T00:00:00.000Z",
      anchor_key_id: anchor.signingKeyId,
      keys: [{
        key_id: receipt.signingKeyId,
        environment: "demo" as const,
        status: "active" as const,
        not_before: "2020-01-01T00:00:00.000Z",
        expires_at: null,
        public_jwk: receipt.publicKeyJwk,
        schema_versions: ["1.0.0"],
        allow_historical_verification: false,
        historical_verify_until: null,
        reason_class: "active",
      }],
    };
    expect(authorityStateDigest(payload)).toBe(issuerAuthorityStateDigest(payload));
    const calls: string[] = [];
    const statusKey = generateTestSigningKeyPair("shared-status");
    const opened = await openInstitutionalSigner({
      provider: "memory",
      environment: "demo",
      anchorKeyId: anchor.signingKeyId,
      statusSignerKeyId: statusKey.signingKeyId,
      publicKeys: { issuer_anchor: anchor.publicKeyJwk, status_signer: statusKey.publicKeyJwk },
      issuer: custody(anchor, "issuer", calls),
      status: custody(statusKey, "status", calls),
    });
    if (!opened.ok) throw new Error(opened.reason);
    const signed = await opened.issuer.signAuthorityChangeApproval({
      retained: null,
      proposed: payload,
      assertedAuthorityStateDigest: issuerAuthorityStateDigest(payload),
    });
    expect(signed.ok).toBe(true);
    if (!signed.ok) return;
    expect(hashAuthorityChangeAuthorization(signed.authorization)).toBe(
      hashIssuerAuthorityChangeAuthorization(signed.authorization),
    );
    expect(verifyIssuerAuthorityChangeAuthorization({
      authorization: signed.authorization,
      signatureBase64Url: signed.signature,
      anchorPublicJwk: anchor.publicKeyJwk,
    })).toEqual({ ok: true });
  });

  it("copies status claims from the evaluation", () => {
    const record = {
      id: "receipt-demo",
      partner_id: "partner-demo",
      policy_id: "policy-demo",
      policy_version: 1,
      status: "active",
      revoked_at: null,
      expires_at: null,
    } as DecisionReceiptRecord;
    const evaluation = {
      evidence_current: false,
      claims_current: false,
      superseded: false,
      lifecycle_status: "active",
      invalidation_reasons: ["evidence_stale"],
      checked_at: "2026-06-02T00:00:00.000Z",
    } as SovereignCurrentValidityResult;
    const payload = receiptStatusPayloadFromEvaluation({
      record,
      evaluation,
      signedIssuerAuthorityEnvironment: "demo",
      statusVersion: 2,
      statusSignerKeyId: "demo-status",
      issuedAt: new Date("2026-06-02T00:00:00.000Z"),
    });
    expect(payload.evidence_current).toBe(false);
    expect(payload.claims_current).toBe(false);
    expect(payload.supersedes_status_version).toBe(1);
  });
});

describeProof("recorded authority and status workflow", () => {
  const anchor = generateTestSigningKeyPair("integration-anchor");
  const receipt = generateTestSigningKeyPair("integration-receipt");
  const rotated = generateTestSigningKeyPair("integration-rotated");
  const statusKey = generateTestSigningKeyPair("integration-status");
  const calls: string[] = [];
  let databaseUrl = "";
  let pool: pg.Pool;
  let issuer: Awaited<ReturnType<typeof openInstitutionalSigner>> extends infer T
    ? T extends { ok: true; issuer: infer I } ? I : never
    : never;
  let status: Awaited<ReturnType<typeof openInstitutionalSigner>> extends infer T
    ? T extends { ok: true; status: infer S } ? S : never
    : never;

  beforeAll(async () => {
    const dbName = "abraxas_signing_integration";
    const admin = new pg.Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:5432/postgres" });
    await admin.query(`drop database if exists "${dbName}" with (force)`);
    await admin.query(`create database "${dbName}"`);
    await admin.end();
    databaseUrl = `postgresql://postgres:postgres@127.0.0.1:5432/${dbName}`;
    resetSovereignStagingPgPoolForTests();
    pool = new pg.Pool({ connectionString: databaseUrl });
    await applySovereignSliceSchema(pool);
    const opened = await openInstitutionalSigner({
      provider: "memory",
      environment: "demo",
      anchorKeyId: anchor.signingKeyId,
      statusSignerKeyId: statusKey.signingKeyId,
      publicKeys: { issuer_anchor: anchor.publicKeyJwk, status_signer: statusKey.publicKeyJwk },
      issuer: custody(anchor, "issuer", calls),
      status: custody(statusKey, "status", calls),
    });
    if (!opened.ok) throw new Error(opened.reason);
    issuer = opened.issuer;
    status = opened.status;
  });

  afterAll(async () => {
    await pool?.end();
    resetSovereignStagingPgPoolForTests();
  });

  function envFor(keys: Array<{ id: string; publicJwk: JsonWebKey; status?: "active" | "retiring" | "retired" | "revoked" }>) {
    return {
      ABRAXAS_RUNTIME_ENV: "demo",
      ABRAXAS_SOVEREIGN_ENV_CLASS: "disposable",
      ABRAXAS_DISPOSABLE_PG_TEST_URL: databaseUrl,
      ABRAXAS_ISSUER_AUTHORITY_ANCHOR_KEY_ID: anchor.signingKeyId,
      ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PUBLIC_JWK: JSON.stringify(anchor.publicKeyJwk),
      ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PRIVATE_JWK: JSON.stringify({ d: "exportable-production-fallback" }),
      ABRAXAS_STATUS_SIGNER_KEY_ID: statusKey.signingKeyId,
      ABRAXAS_STATUS_SIGNER_PUBLIC_JWK: JSON.stringify(statusKey.publicKeyJwk),
      ABRAXAS_STATUS_SIGNER_PRIVATE_JWK: JSON.stringify({ d: "exportable-status-fallback" }),
      ABRAXAS_RECEIPT_VERIFICATION_REGISTRY: JSON.stringify(keys.map((key) => {
        const keyStatus = key.status ?? "active";
        return {
          key_id: key.id,
          environment: "demo",
          status: keyStatus,
          public_jwk: key.publicJwk,
          fingerprint: publicReceiptJwkFingerprint(key.publicJwk as { kty: "OKP"; crv: "Ed25519"; x: string }),
          issued_at: "2020-01-01T00:00:00.000Z",
          not_before: "2020-01-01T00:00:00.000Z",
          expires_at: null,
          schema_versions: [DECISION_RECEIPT_SCHEMA_VERSION],
          reason_class: keyStatus === "revoked" ? "compromise" : keyStatus === "active" ? "active" : "rotation",
          allow_historical_verification: keyStatus !== "active",
          historical_verify_until: keyStatus === "active" ? null : "2099-01-01T00:00:00.000Z",
        };
      })),
    };
  }

  async function propose(env: Record<string, string>, version: number, supersedes: number | null) {
    const built = buildIssuerAuthorityStatementFromRegistry({
      registryVersion: version,
      supersedesRegistryVersion: supersedes,
      anchorKeyId: anchor.signingKeyId,
      issuedAt: "2026-06-01T00:00:00.000Z",
      env,
    });
    if (!built.ok) throw new Error(built.reason);
    const described = describeConfiguredIssuerAuthority({ env, anchorKeyId: anchor.signingKeyId });
    if (!described.ok) throw new Error(described.reason);
    return { env, payload: built.payload, digest: described.authorityStateDigest };
  }

  it("bootstraps, reuses, rotates, revokes, and rejects a fabricated snapshot or unapproved keys", async () => {
    const active = envFor([{ id: receipt.signingKeyId, publicJwk: receipt.publicKeyJwk }]);
    const bootstrap = await propose(active, 854, null);
    const established = await approveRecordedAuthorityChange({
      env: active,
      issuer,
      proposed: bootstrap.payload,
      assertedAuthorityStateDigest: bootstrap.digest,
    });
    expect(established).toMatchObject({ ok: true, registryVersion: 854, repeated: false });
    expect(JSON.stringify(established)).not.toContain("exportable-production-fallback");

    const repeated = await resolveIssuerAuthorityRegistryContinuity({
      env: active,
      anchorKeyId: anchor.signingKeyId,
    });
    expect(repeated).toMatchObject({ ok: true, registryVersion: 854, repeated: true });
    const recorded = await signRecordedIssuerAuthorityStatement({
      env: active,
      issuer,
      anchorKeyId: anchor.signingKeyId,
      issuedAt: "2026-06-01T00:00:00.000Z",
    });
    expect(recorded.ok).toBe(true);
    if (!recorded.ok) return;
    expect(recorded.statement.payload.registry_version).toBe(854);
    expect(recorded.statement.payload.keys.map((key) => key.key_id)).toEqual([receipt.signingKeyId]);

    const signsBeforeIntruder = calls.filter((call) => call === "issuer").length;
    const intruder = envFor([{ id: rotated.signingKeyId, publicJwk: rotated.publicKeyJwk }]);
    expect(await signRecordedIssuerAuthorityStatement({
      env: intruder,
      issuer,
      anchorKeyId: anchor.signingKeyId,
      issuedAt: "2026-06-01T00:00:00.000Z",
    })).toEqual({ ok: false, reason: "recorded_authority_mismatch" });
    expect(calls.filter((call) => call === "issuer").length).toBe(signsBeforeIntruder);

    const retiring = envFor([{ id: receipt.signingKeyId, publicJwk: receipt.publicKeyJwk, status: "retiring" }]);
    const rotation = await propose(retiring, 855, 854);
    const rotatedRow = await approveRecordedAuthorityChange({
      env: retiring,
      issuer,
      proposed: rotation.payload,
      assertedAuthorityStateDigest: rotation.digest,
    });
    expect(rotatedRow).toMatchObject({ ok: true, registryVersion: 855 });

    const revokedEnv = envFor([{ id: receipt.signingKeyId, publicJwk: receipt.publicKeyJwk, status: "revoked" }]);
    const revocation = await propose(revokedEnv, 856, 855);
    const revokedRow = await approveRecordedAuthorityChange({
      env: revokedEnv,
      issuer,
      proposed: revocation.payload,
      assertedAuthorityStateDigest: revocation.digest,
    });
    expect(revokedRow).toMatchObject({ ok: true, registryVersion: 856 });
    const revokedStatement = await signRecordedIssuerAuthorityStatement({
      env: revokedEnv,
      issuer,
      anchorKeyId: anchor.signingKeyId,
      issuedAt: "2026-06-01T00:00:00.000Z",
    });
    expect(revokedStatement.ok).toBe(true);
    if (!revokedStatement.ok) return;
    expect(revokedStatement.statement.payload.keys[0]?.status).toBe("revoked");

    const signsBeforeStale = calls.filter((call) => call === "issuer").length;
    const staleProposal = await propose(intruder, 855, 854);
    expect(await approveRecordedAuthorityChange({
      env: intruder,
      issuer,
      proposed: staleProposal.payload,
      assertedAuthorityStateDigest: staleProposal.digest,
    })).toEqual({ ok: false, reason: "stale_authority_approval" });
    expect(calls.filter((call) => call === "issuer").length).toBe(signsBeforeStale);

    const fabricated = await issuer.signAuthorityChangeApproval({
      retained: { registryVersion: 1, authorityStateDigest: "ab".repeat(32) },
      proposed: {
        ...staleProposal.payload,
        registry_version: 2,
        supersedes_registry_version: 1,
      },
      assertedAuthorityStateDigest: issuerAuthorityStateDigest(staleProposal.payload),
    });
    expect(fabricated.ok).toBe(true);
    if (!fabricated.ok) return;
    const { applyIssuerAuthorityChangeAuthorization } = await import("@/lib/persistence/boundary/issuerAuthority/registryContinuity");
    const stored = await applyIssuerAuthorityChangeAuthorization({
      env: intruder,
      authorization: fabricated.authorization,
      signatureBase64Url: fabricated.signature,
    });
    expect(stored).toEqual({ ok: false, reason: "stale_authority_approval" });
    const versions = await pool.query<{ registry_version: number }>(
      `select registry_version from public.issuer_authority_registry_continuity order by registry_version`,
    );
    expect(versions.rows.map((row) => row.registry_version)).toEqual([854, 855, 856]);
  });

  it("records one concurrent change and leaves the other stale", async () => {
    const left = envFor([{ id: rotated.signingKeyId, publicJwk: rotated.publicKeyJwk }]);
    const right = envFor([{ id: statusKey.signingKeyId, publicJwk: statusKey.publicKeyJwk }]);
    const [leftProposal, rightProposal] = await Promise.all([
      propose(left, 857, 856),
      propose(right, 857, 856),
    ]);
    const outcomes = await Promise.all([
      approveRecordedAuthorityChange({
        env: left,
        issuer,
        proposed: leftProposal.payload,
        assertedAuthorityStateDigest: leftProposal.digest,
      }),
      approveRecordedAuthorityChange({
        env: right,
        issuer,
        proposed: rightProposal.payload,
        assertedAuthorityStateDigest: rightProposal.digest,
      }),
    ]);
    expect(outcomes.filter((outcome) => outcome.ok)).toHaveLength(1);
    expect(outcomes.filter((outcome) => !outcome.ok && outcome.reason === "stale_authority_approval")).toHaveLength(1);
  });

  it("publishes the evaluation's status and refuses an exportable status key", async () => {
    await pool.query(`insert into public.partners (partner_id, status) values ('partner-demo', 'active')`);
    await pool.query(
      `insert into public.partner_policies (id, partner_id, version, name) values ('policy-demo', 'partner-demo', 1, 'demo')`,
    );
    await pool.query(`insert into public.issuer_signing_keys (signing_key_id) values ('integration-receipt')`);
    await pool.query(
      `insert into public.decision_receipts (
         id, verification_decision_id, partner_id, policy_id, policy_version, subject_pseudonym_id,
         decision_result, decision_context, evaluated_at, status, issuance_finalized_at,
         schema_version, payload_hash, signature, signing_key_id
       ) values (
         'receipt-demo', '00000000-0000-4000-8000-000000000949', 'partner-demo', 'policy-demo', 1, 'subject-demo',
         'approved', 'production', '2026-06-01T00:00:00.000Z', 'active', '2026-06-01T00:00:00.000Z',
         '1.0.0', 'abc', 'sig', 'integration-receipt'
       )`,
    );
    const record = {
      id: "receipt-demo",
      verification_decision_id: "00000000-0000-4000-8000-000000000949",
      consent_receipt_id: null,
      partner_id: "partner-demo",
      policy_id: "policy-demo",
      policy_version: 1,
      subject_pseudonym_id: "subject-demo",
      wallet_binding_ref: null,
      decision_result: "approved",
      reason_codes: [],
      evaluated_claim_refs: [],
      issuer_refs: [],
      decision_context: "production",
      evaluated_at: "2026-06-01T00:00:00.000Z",
      expires_at: null,
      revoked_at: null,
      status: "active",
      issuance_finalized_at: "2026-06-01T00:00:00.000Z",
      schema_version: "1.0.0",
      payload_hash: "abc",
      signature: "sig",
      signing_key_id: "integration-receipt",
      anchor_reference: null,
      idempotency_key: null,
      created_at: "2026-06-01T00:00:00.000Z",
    } as DecisionReceiptRecord;
    const evaluation = {
      signature_authentic: true,
      issuer_authorized: true,
      policy_and_audience_match: true,
      currently_acceptable: false,
      invalidation_reasons: ["evidence_stale"],
      store_available: true,
      checked_at: "2026-06-02T00:00:00.000Z",
      cryptographically_valid: true,
      superseded: false,
      claims_current: false,
      evidence_current: false,
      lifecycle_status: "active",
    } satisfies SovereignCurrentValidityResult;
    const candidates = [
      envFor([{ id: receipt.signingKeyId, publicJwk: receipt.publicKeyJwk, status: "revoked" }]),
      envFor([{ id: rotated.signingKeyId, publicJwk: rotated.publicKeyJwk }]),
      envFor([{ id: statusKey.signingKeyId, publicJwk: statusKey.publicKeyJwk }]),
    ];
    let env = candidates[0];
    let issuerStatement: Awaited<ReturnType<typeof signRecordedIssuerAuthorityStatement>> | null = null;
    for (const candidate of candidates) {
      const signed = await signRecordedIssuerAuthorityStatement({
        env: candidate,
        issuer,
        anchorKeyId: anchor.signingKeyId,
        issuedAt: "2026-06-01T00:00:00.000Z",
      });
      if (signed.ok) {
        env = candidate;
        issuerStatement = signed;
        break;
      }
    }
    const first = await publishAuthoritativeReceiptStatus({
      env,
      status,
      statusSignerKeyId: statusKey.signingKeyId,
      record,
      evaluation,
      issuedAt: new Date("2026-06-02T00:00:00.000Z"),
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.statement.payload.evidence_current).toBe(false);
    expect(first.statement.payload.claims_current).toBe(false);
    expect(first.statement.payload.status_version).toBe(1);
    expect(JSON.stringify(first)).not.toContain("exportable-status-fallback");
    expect(verifyEd25519Detached({
      message: Buffer.from(first.statement.payload_hash, "hex"),
      signatureBase64Url: first.statement.signature,
      publicJwk: statusKey.publicKeyJwk,
    })).toBe(true);
    expect(issuerStatement?.ok).toBe(true);
    if (!issuerStatement?.ok) return;
    expect(verifySignedReceiptStatusStatement({
      signedStatus: first.statement,
      signedIssuerAuthority: issuerStatement.statement,
      now: new Date("2026-06-02T00:01:00.000Z"),
    }).ok).toBe(true);
    const second = await publishAuthoritativeReceiptStatus({
      env,
      status,
      statusSignerKeyId: statusKey.signingKeyId,
      record,
      evaluation,
      issuedAt: new Date("2026-06-02T00:02:00.000Z"),
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.statement.payload.status_version).toBe(2);
    expect(second.statement.payload.supersedes_status_version).toBe(1);
    expect("signAuthorityChangeApproval" in status).toBe(false);
  });
});
