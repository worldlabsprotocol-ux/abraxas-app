import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import nacl from "tweetnacl";
import {
  authorityCheckpointFromStatement,
  issuerAuthorityStateDigest,
  verifyAbraxasReceiptIndependently,
  verifyEd25519Detached,
  verifySignedReceiptStatusStatement,
} from "@abraxas/independent-verifier";
import { buildCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import { DECISION_RECEIPT_SCHEMA_VERSION, type DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { generateTestSigningKeyPair, signReceiptPayload } from "@/lib/decisionReceipts/signing";
import { publicReceiptJwkFingerprint } from "@/lib/decisionReceipts/verificationKeyLifecycle/fingerprint";
import { applySovereignSliceSchema } from "@/lib/persistence/boundary/sovereignSlice/bootstrap";
import { resetSovereignStagingPgPoolForTests } from "@/lib/persistence/boundary/sovereignStagingPg";
import { buildIssuerAuthorityStatementFromRegistry } from "@/lib/persistence/boundary/issuerAuthority/buildFromRegistry";
import {
  applyIssuerAuthorityChangeAuthorization,
  describeConfiguredIssuerAuthority,
  hashIssuerAuthorityChangeAuthorization,
  verifyIssuerAuthorityChangeAuthorization,
} from "@/lib/persistence/boundary/issuerAuthority/registryContinuity";
import type { SovereignCurrentValidityResult } from "@/lib/persistence/boundary/sovereignCurrentValidity/evaluate";
import { receiptStatusPayloadFromEvaluation } from "@/lib/persistence/boundary/trustDistribution/publishSignedReceiptStatus";
import { buildTrustAnchorBundleV1 } from "@/lib/persistence/boundary/trustDistribution/buildTrustAnchorBundle";
import {
  authorityStateDigest,
  hashAuthorityChangeAuthorization,
} from "./authorityChange";
import type { CustodyClient } from "./contract";
import { openInstitutionalSigner } from "./institutionalSigner";
import {
  GOVERNANCE_PIN_CUSTODY,
  governanceApprovalMatchesTransition,
  signAuthorityGovernanceApproval,
  signGovernanceSuccession,
  verifyAuthorityGovernanceApproval,
  verifyGovernanceSuccession,
} from "@/lib/persistence/boundary/issuerAuthority/governanceApproval";
import {
  approveRecordedAuthorityChange,
  GOVERNANCE_APPROVAL_DOCUMENT,
  publishAuthoritativeReceiptStatus,
  signRecordedIssuerAuthorityStatement,
} from "./recordedWorkflow";

const PROOF = process.env.ABRAXAS_SOVEREIGN_OPERATIONAL_PROOF === "1";
const describeProof = PROOF ? describe : describe.skip;

type ApprovalInput = Parameters<typeof approveRecordedAuthorityChange>[0];
type StatusInput = Parameters<typeof publishAuthoritativeReceiptStatus>[0];
type RetainedIsAbsent = "retained" extends keyof ApprovalInput ? never : true;
type EvaluationIsAbsent = "evaluation" extends keyof StatusInput ? never : true;
type CallerRecordIsAbsent = "record" extends keyof StatusInput ? never : true;
const retainedIsAbsent: RetainedIsAbsent = true;
const evaluationIsAbsent: EvaluationIsAbsent = true;
const callerRecordIsAbsent: CallerRecordIsAbsent = true;

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
    expect(evaluationIsAbsent).toBe(true);
    expect(callerRecordIsAbsent).toBe(true);
    expect(GOVERNANCE_PIN_CUSTODY.verificationImplemented).toBe(true);
    expect(GOVERNANCE_PIN_CUSTODY.independentCustodyDemonstrated).toBe(false);
    expect(GOVERNANCE_PIN_CUSTODY.multisignature).toBe(false);
    const governance = generateTestSigningKeyPair("shared-governance");
    const successor = generateTestSigningKeyPair("shared-governance-successor");
    const approval = {
      document: GOVERNANCE_APPROVAL_DOCUMENT,
      schema_version: "1.0.0" as const,
      environment: "demo" as const,
      action: "rotation" as const,
      authority_state_digest: "ab".repeat(32),
      registry_version: 855,
      supersedes_registry_version: 853,
      governance_key_id: governance.signingKeyId,
    };
    const staleTransition = governanceApprovalMatchesTransition({
      approval,
      environment: "demo",
      action: "rotation",
      authorityStateDigest: "ab".repeat(32),
      registryVersion: 855,
      supersedesRegistryVersion: 854,
      recordedVersion: 854,
    });
    expect(staleTransition.ok).toBe(false);
    if (!staleTransition.ok) expect(staleTransition.reason).toBe("stale_governance_approval");
    expect(verifyAuthorityGovernanceApproval({
      approval: { ...approval, supersedes_registry_version: 854, registry_version: 855 },
      signatureBase64Url: signAuthorityGovernanceApproval({
        approval: { ...approval, supersedes_registry_version: 854, registry_version: 855 },
        governancePrivateJwk: governance.privateKeyJwk,
      }),
      pin: { keyId: governance.signingKeyId, publicJwk: governance.publicKeyJwk },
    })).toEqual({ ok: true });
    const succession = {
      document: "abraxas_governance_succession/1.0.0" as const,
      schema_version: "1.0.0" as const,
      environment: "demo" as const,
      current_governance_key_id: governance.signingKeyId,
      successor_governance_key_id: successor.signingKeyId,
      successor_public_jwk: successor.publicKeyJwk,
    };
    expect(verifyGovernanceSuccession({
      succession,
      signatureBase64Url: signGovernanceSuccession({
        succession,
        governancePrivateJwk: governance.privateKeyJwk,
      }),
      currentPin: { keyId: governance.signingKeyId, publicJwk: governance.publicKeyJwk },
      anchorKeyId: "shared-anchor",
      anchorPublicJwk: generateTestSigningKeyPair("succession-anchor").publicKeyJwk,
      authorityKeys: [],
      statusSigners: [],
    }).ok).toBe(true);
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
  const governance = generateTestSigningKeyPair("integration-governance");
  const otherGovernance = generateTestSigningKeyPair("integration-governance-other");
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

  async function versions() {
    const stored = await pool.query<{ registry_version: number }>(
      `select registry_version from public.issuer_authority_registry_continuity order by registry_version`,
    );
    return stored.rows.map((row) => row.registry_version);
  }

  function governed(
    digest: string,
    version: number,
    supersedes: number | null,
    action: "bootstrap" | "rotation" | "revocation",
    environment: "demo" | "production" = "demo",
    signer: { signingKeyId: string; publicKeyJwk: JsonWebKey; privateKeyJwk: JsonWebKey } = governance,
  ) {
    const approval = {
      document: GOVERNANCE_APPROVAL_DOCUMENT,
      schema_version: "1.0.0" as const,
      environment,
      action,
      registry_version: version,
      supersedes_registry_version: supersedes,
      authority_state_digest: digest,
      governance_key_id: signer.signingKeyId,
    };
    return {
      governanceApproval: approval,
      governanceSignatureBase64Url: signAuthorityGovernanceApproval({
        approval,
        governancePrivateJwk: signer.privateKeyJwk,
      }),
      governancePin: { keyId: governance.signingKeyId, publicJwk: governance.publicKeyJwk },
    };
  }

  it("requires both the issuer signature and the independent governance signature", async () => {
    const active = envFor([{ id: receipt.signingKeyId, publicJwk: receipt.publicKeyJwk }]);
    const bootstrap = await propose(active, 854, null);
    const signsBefore = calls.filter((call) => call === "issuer").length;
    expect(await approveRecordedAuthorityChange({
      env: active,
      issuer,
      proposed: bootstrap.payload,
      assertedAuthorityStateDigest: bootstrap.digest,
    })).toEqual({ ok: false, reason: "independent_governance_approval_required" });
    expect(calls.filter((call) => call === "issuer").length).toBe(signsBefore);

    const issuerOnly = await issuer.signAuthorityChangeApproval({
      retained: null,
      proposed: bootstrap.payload,
      assertedAuthorityStateDigest: bootstrap.digest,
    });
    expect(issuerOnly.ok).toBe(true);
    if (!issuerOnly.ok) return;
    const governanceOnly = governed(bootstrap.digest, 854, null, "bootstrap");
    expect(await applyIssuerAuthorityChangeAuthorization({
      env: active,
      authorization: issuerOnly.authorization,
      signatureBase64Url: "not-an-issuer-signature",
      ...governanceOnly,
    })).toEqual({ ok: false, reason: "authority_approval_signature_invalid" });
    expect(await applyIssuerAuthorityChangeAuthorization({
      env: active,
      authorization: issuerOnly.authorization,
      signatureBase64Url: issuerOnly.signature,
      ...governed(bootstrap.digest, 854, null, "bootstrap", "demo", anchor),
      governancePin: { keyId: anchor.signingKeyId, publicJwk: anchor.publicKeyJwk },
    })).toEqual({ ok: false, reason: "governance_pin_not_independent" });
    const substituted = governed(bootstrap.digest, 854, null, "bootstrap");
    substituted.governanceSignatureBase64Url = signAuthorityGovernanceApproval({
      approval: substituted.governanceApproval,
      governancePrivateJwk: otherGovernance.privateKeyJwk,
    });
    expect(await applyIssuerAuthorityChangeAuthorization({
      env: active,
      authorization: issuerOnly.authorization,
      signatureBase64Url: issuerOnly.signature,
      ...substituted,
    })).toEqual({ ok: false, reason: "governance_approval_signature_invalid" });
    expect(await versions()).toEqual([]);

    const established = await approveRecordedAuthorityChange({
      env: active,
      issuer,
      proposed: bootstrap.payload,
      assertedAuthorityStateDigest: bootstrap.digest,
      ...governed(bootstrap.digest, 854, null, "bootstrap"),
    });
    expect(established).toMatchObject({ ok: true, registryVersion: 854, repeated: false });
    expect(JSON.stringify(established)).not.toContain("exportable-production-fallback");
    expect(await approveRecordedAuthorityChange({
      env: active,
      issuer,
      proposed: bootstrap.payload,
      assertedAuthorityStateDigest: bootstrap.digest,
      ...governed(bootstrap.digest, 854, null, "bootstrap"),
    })).toEqual({ ok: false, reason: "replayed_governance_approval" });

    const mismatched = governed("cd".repeat(32), 855, 854, "rotation");
    expect(await approveRecordedAuthorityChange({
      env: active,
      issuer,
      proposed: bootstrap.payload,
      assertedAuthorityStateDigest: bootstrap.digest,
      ...mismatched,
    })).toEqual({ ok: false, reason: "governance_digest_mismatch" });
    const wrongEnvironment = governed(bootstrap.digest, 854, null, "bootstrap", "production");
    expect(await approveRecordedAuthorityChange({
      env: active,
      issuer,
      proposed: bootstrap.payload,
      assertedAuthorityStateDigest: bootstrap.digest,
      ...wrongEnvironment,
    })).toEqual({ ok: false, reason: "governance_environment_mismatch" });
    expect(await versions()).toEqual([854]);

    const recorded = await signRecordedIssuerAuthorityStatement({
      env: active,
      issuer,
      anchorKeyId: anchor.signingKeyId,
      issuedAt: "2026-06-01T00:00:00.000Z",
    });
    expect(recorded.ok).toBe(true);
    if (!recorded.ok) return;
    expect(recorded.statement.payload.registry_version).toBe(854);

    const intruder = envFor([{ id: rotated.signingKeyId, publicJwk: rotated.publicKeyJwk }]);
    const signsBeforeIntruder = calls.filter((call) => call === "issuer").length;
    expect(await signRecordedIssuerAuthorityStatement({
      env: intruder,
      issuer,
      anchorKeyId: anchor.signingKeyId,
      issuedAt: "2026-06-01T00:00:00.000Z",
    })).toEqual({ ok: false, reason: "recorded_authority_mismatch" });
    expect(calls.filter((call) => call === "issuer").length).toBe(signsBeforeIntruder);

    const retiring = envFor([{ id: receipt.signingKeyId, publicJwk: receipt.publicKeyJwk, status: "retiring" }]);
    const rotation = await propose(retiring, 855, 854);
    const signsBeforeStale = calls.filter((call) => call === "issuer").length;
    expect(await approveRecordedAuthorityChange({
      env: retiring,
      issuer,
      proposed: rotation.payload,
      assertedAuthorityStateDigest: rotation.digest,
      ...governed(rotation.digest, 855, 853, "rotation"),
    })).toEqual({ ok: false, reason: "stale_governance_approval" });
    expect(calls.filter((call) => call === "issuer").length).toBe(signsBeforeStale);
    expect(await versions()).toEqual([854]);
  });

  it("signs the stored evaluation and refuses revoked, expired, or fabricated-positive evidence", async () => {
    const active = envFor([{ id: receipt.signingKeyId, publicJwk: receipt.publicKeyJwk }]);
    const issuerStatement = await signRecordedIssuerAuthorityStatement({
      env: active,
      issuer,
      anchorKeyId: anchor.signingKeyId,
      issuedAt: "2026-06-01T00:00:00.000Z",
    });
    expect(issuerStatement.ok).toBe(true);
    if (!issuerStatement.ok) return;
    await pool.query(`insert into public.partners (partner_id, status) values ('partner-demo', 'active')`);
    await pool.query(
      `insert into public.partner_policies (id, partner_id, version, name) values ('policy-demo', 'partner-demo', 1, 'demo')`,
    );
    await pool.query(`insert into public.issuer_signing_keys (signing_key_id) values ($1)`, [receipt.signingKeyId]);

    async function insertSignedReceipt(input: {
      id: string;
      decisionId: string;
      status: "active" | "expired" | "revoked";
      expiresAt: string | null;
      revokedAt: string | null;
      claimRefs?: DecisionReceiptRecord["evaluated_claim_refs"];
    }) {
      const canonical = buildCanonicalPayload({
        receipt_id: input.id,
        decision_id: input.decisionId,
        policy_id: "policy-demo",
        policy_version: 1,
        partner_id: "partner-demo",
        subject_pseudonym_id: "subject-demo",
        wallet_binding_ref: null,
        consent_receipt_id: null,
        decision_result: "approved",
        reason_codes: [],
        evaluated_claim_refs: input.claimRefs ?? [],
        issuer_refs: [],
        decision_context: "sandbox_only",
        evaluated_at: "2026-06-01T00:00:00.000Z",
        expires_at: input.expiresAt,
      });
      const signedReceipt = signReceiptPayload(canonical, receipt.privateKeyJwk);
      await pool.query(
        `insert into public.decision_receipts (
           id, verification_decision_id, partner_id, policy_id, policy_version, subject_pseudonym_id,
           decision_result, decision_context, evaluated_at, expires_at, revoked_at, status, issuance_finalized_at,
           schema_version, payload_hash, signature, signing_key_id, reason_codes, evaluated_claim_refs, issuer_refs
         ) values (
           $1, $2, 'partner-demo', 'policy-demo', 1, 'subject-demo',
           'approved', 'sandbox_only', $3, $4, $5, $6, $3,
           '1.0.0', $7, $8, $9, '{}', $10::jsonb, '{}'
         )`,
        [
          input.id,
          input.decisionId,
          canonical.evaluated_at,
          input.expiresAt,
          input.revokedAt,
          input.status,
          signedReceipt.payloadHash,
          signedReceipt.signature,
          receipt.signingKeyId,
          JSON.stringify(input.claimRefs ?? []),
        ],
      );
      return { canonical, signedReceipt };
    }

    const current = await insertSignedReceipt({
      id: "receipt-current",
      decisionId: "00000000-0000-4000-8000-000000000950",
      status: "active",
      expiresAt: null,
      revokedAt: null,
    });
    const statusSignsBefore = calls.filter((call) => call === "status").length;
    const genuine = await publishAuthoritativeReceiptStatus({
      env: active,
      status,
      statusSignerKeyId: statusKey.signingKeyId,
      receiptId: current.canonical.receipt_id,
      signedIssuerAuthority: issuerStatement.statement,
    });
    expect(genuine.ok).toBe(true);
    if (!genuine.ok) return;
    expect(genuine.statement.payload.evidence_current).toBe(true);
    expect(genuine.statement.payload.claims_current).toBe(true);
    expect(genuine.statement.payload.receipt_status).toBe("active");
    expect(genuine.statement.payload.partner_id).toBe("partner-demo");
    expect(genuine.statement.payload.policy_id).toBe("policy-demo");
    expect(genuine.statement.payload.environment).toBe("demo");
    expect(genuine.statement.payload.status_version).toBe(1);
    expect(JSON.stringify(genuine)).not.toContain("exportable-status-fallback");
    expect(verifyEd25519Detached({
      message: Buffer.from(genuine.statement.payload_hash, "hex"),
      signatureBase64Url: genuine.statement.signature,
      publicJwk: statusKey.publicKeyJwk,
    })).toBe(true);
    expect(verifySignedReceiptStatusStatement({
      signedStatus: genuine.statement,
      signedIssuerAuthority: issuerStatement.statement,
      now: new Date(),
    }).ok).toBe(true);
    const loaded = await pool.query<{ payload_hash: string; signature: string; evaluated_at: Date; created_at: Date }>(
      `select payload_hash, signature, evaluated_at, created_at from public.decision_receipts where id = $1`,
      [current.canonical.receipt_id],
    );
    const row = loaded.rows[0];
    if (!row) throw new Error("receipt missing");
    const independent = verifyAbraxasReceiptIndependently({
      record: {
        id: current.canonical.receipt_id,
        verification_decision_id: current.canonical.decision_id,
        consent_receipt_id: null,
        partner_id: current.canonical.partner_id,
        policy_id: current.canonical.policy_id,
        policy_version: current.canonical.policy_version,
        subject_pseudonym_id: current.canonical.subject_pseudonym_id,
        wallet_binding_ref: null,
        decision_result: "approved",
        reason_codes: [],
        evaluated_claim_refs: [],
        issuer_refs: [],
        decision_context: "sandbox_only",
        evaluated_at: row.evaluated_at.toISOString(),
        expires_at: null,
        revoked_at: null,
        status: "active",
        schema_version: "1.0.0",
        payload_hash: row.payload_hash,
        signature: row.signature,
        signing_key_id: receipt.signingKeyId,
      },
      pinnedTrustAnchor: buildTrustAnchorBundleV1({
        anchorKeyId: anchor.signingKeyId,
        anchorPublicJwk: anchor.publicKeyJwk,
        environment: "demo",
      }),
      signedIssuerAuthority: issuerStatement.statement,
      relyingParty: { partner_id: "partner-demo", policy_id: "policy-demo", environment: "demo" },
      signedStatusStatement: genuine.statement,
      statementObservedAt: new Date().toISOString(),
      ...authorityCheckpointFromStatement(issuerStatement.statement),
      now: new Date(),
    });
    expect(independent.status_evidence_authentic).toBe(true);
    expect(independent.currently_acceptable).toBe("yes");

    await pool.query(
      `update public.decision_receipts set status = 'revoked', revoked_at = now() where id = $1`,
      [current.canonical.receipt_id],
    );
    const revoked = await publishAuthoritativeReceiptStatus({
      env: active,
      status,
      statusSignerKeyId: statusKey.signingKeyId,
      receiptId: current.canonical.receipt_id,
      signedIssuerAuthority: issuerStatement.statement,
    });
    expect(revoked.ok).toBe(true);
    if (!revoked.ok) return;
    expect(revoked.statement.payload.receipt_status).toBe("revoked");
    expect(revoked.statement.payload.status_version).toBe(2);

    const expired = await insertSignedReceipt({
      id: "receipt-expired",
      decisionId: "00000000-0000-4000-8000-000000000951",
      status: "active",
      expiresAt: "2020-01-01T00:00:00.000Z",
      revokedAt: null,
    });
    const expiredStatus = await publishAuthoritativeReceiptStatus({
      env: active,
      status,
      statusSignerKeyId: statusKey.signingKeyId,
      receiptId: expired.canonical.receipt_id,
      signedIssuerAuthority: issuerStatement.statement,
    });
    expect(expiredStatus.ok).toBe(true);
    if (!expiredStatus.ok) return;
    expect(expiredStatus.statement.payload.receipt_status).toBe("expired");

    const claimId = "claim-revoked-integration";
    await pool.query(
      `insert into public.sovereign_claim_status (claim_id, status) values ($1, 'revoked')`,
      [claimId],
    );
    await pool.query(
      `insert into public.sovereign_evidence_sources (source_credential_id, status) values ('source-integration', 'active')`,
    );
    const revokedClaim = await insertSignedReceipt({
      id: "receipt-revoked-claim",
      decisionId: "00000000-0000-4000-8000-000000000952",
      status: "active",
      expiresAt: null,
      revokedAt: null,
      claimRefs: [{
        claim_id: claimId,
        claim_type: "age21",
        issuer_id: "issuer:abraxas",
        status: "active",
        issued_at: "2026-06-01T00:00:00.000Z",
        expires_at: null,
      }],
    });
    await pool.query(
      `insert into public.sovereign_receipt_evidence_dependencies (receipt_id, source_credential_id)
       values ($1, 'source-integration')`,
      [revokedClaim.canonical.receipt_id],
    );
    const signsBeforeClaim = calls.filter((call) => call === "status").length;
    const blocked = await publishAuthoritativeReceiptStatus({
      env: active,
      status,
      statusSignerKeyId: statusKey.signingKeyId,
      receiptId: revokedClaim.canonical.receipt_id,
      signedIssuerAuthority: issuerStatement.statement,
    });
    expect(blocked).toEqual({ ok: false, reason: "authoritative_validity_indeterminate" });
    expect(calls.filter((call) => call === "status").length).toBe(signsBeforeClaim);
    expect(statusSignsBefore).toBeLessThan(calls.filter((call) => call === "status").length);
    expect("signAuthorityChangeApproval" in status).toBe(false);
  });

  it("records one governed rotation and revocation and rejects the concurrent loser", async () => {
    const retiring = envFor([{ id: receipt.signingKeyId, publicJwk: receipt.publicKeyJwk, status: "retiring" }]);
    const rotation = await propose(retiring, 855, 854);
    const rotatedRow = await approveRecordedAuthorityChange({
      env: retiring,
      issuer,
      proposed: rotation.payload,
      assertedAuthorityStateDigest: rotation.digest,
      ...governed(rotation.digest, 855, 854, "rotation"),
    });
    expect(rotatedRow).toMatchObject({ ok: true, registryVersion: 855 });
    expect(await approveRecordedAuthorityChange({
      env: retiring,
      issuer,
      proposed: rotation.payload,
      assertedAuthorityStateDigest: rotation.digest,
      ...governed(rotation.digest, 855, 854, "rotation"),
    })).toEqual({ ok: false, reason: "replayed_governance_approval" });

    const revokedEnv = envFor([{ id: receipt.signingKeyId, publicJwk: receipt.publicKeyJwk, status: "revoked" }]);
    const revocation = await propose(revokedEnv, 856, 855);
    const revokedRow = await approveRecordedAuthorityChange({
      env: revokedEnv,
      issuer,
      proposed: revocation.payload,
      assertedAuthorityStateDigest: revocation.digest,
      ...governed(revocation.digest, 856, 855, "revocation"),
    });
    expect(revokedRow).toMatchObject({ ok: true, registryVersion: 856 });

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
        ...governed(leftProposal.digest, 857, 856, "rotation"),
      }),
      approveRecordedAuthorityChange({
        env: right,
        issuer,
        proposed: rightProposal.payload,
        assertedAuthorityStateDigest: rightProposal.digest,
        ...governed(rightProposal.digest, 857, 856, "rotation"),
      }),
    ]);
    expect(outcomes.filter((outcome) => outcome.ok)).toHaveLength(1);
    expect(outcomes.filter((outcome) => !outcome.ok && outcome.reason === "stale_governance_approval")).toHaveLength(1);
    expect(await versions()).toEqual([854, 855, 856, 857]);
  });
});
