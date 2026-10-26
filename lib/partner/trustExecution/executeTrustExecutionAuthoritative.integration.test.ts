/**
 * Build #854 — authoritative trust execution evidence + idempotency (disposable PG).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { Keypair } from "@solana/web3.js";
import { applySovereignSliceSchema } from "@/lib/persistence/boundary/sovereignSlice/bootstrap";
import { resetSovereignStagingPgPoolForTests } from "@/lib/persistence/boundary/sovereignStagingPg";
import {
  authorizePartnerTrustExecution,
  issuePartnerTrustExecutionChallenge,
} from "./partnerTrustExecutionService";
import { executeTrustExecutionAuthoritativeDecision } from "./executeTrustExecutionAuthoritative";
import { executeTrustExecutionDecision } from "./executeTrustExecutionDecision";
import { signWalletScopedTrustMessage } from "@/lib/protocolExecution/walletSovereignTrustPath";
import { loadScopedTrustChallenge } from "@/lib/auth/walletAuthorization/scopedChallengePostgresStore";
import { bindTrustExecutionSubjectPseudonym } from "./trustExecutionSubjectBinding";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { registryEnv } from "@/lib/persistence/boundary/staging/build834Fixtures";
import { loadConsumedAuthorization } from "./executeTrustExecutionDecision";
import { verifyAbraxasReceiptIndependently } from "@abraxas/independent-verifier";
import { buildTrustAnchorBundleV1 } from "@/lib/persistence/boundary/trustDistribution/buildTrustAnchorBundle";
import { buildCanonicalPayload, hashCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import { verifyReceiptSignature, loadReceiptSigningKey } from "@/lib/decisionReceipts/signing";

const PROOF = process.env.ABRAXAS_SOVEREIGN_OPERATIONAL_PROOF === "1";
const describeProof = PROOF ? describe : describe.skip;

const PARTNER = "partner-build854-auth";
const APP_ID = "00000000-0000-4000-8000-000000008855";
const POLICY = "policy-build854-auth";
const SOURCE_ID = "cred_build854_auth_source";
const CLAIM_ID = "claim_build854_auth";

describeProof("Build #854 authoritative trust execution evidence", () => {
  let pool: pg.Pool;
  let kp: Keypair;
  let wallet: string;
  let subjectPseudonym: string;

  beforeAll(async () => {
    process.env.ABRAXAS_SOVEREIGN_ENV_CLASS = "disposable";
    process.env.ABRAXAS_SOVEREIGN_STAGING_FIXTURE_WRITES = "true";
    delete process.env.ABRAXAS_TRUST_EXECUTION_CONTROLLED_TEST_EVIDENCE;
    delete process.env.ABRAXAS_TRUST_EXECUTION_FIXTURE_ATTESTATION;

    const receiptKey = generateTestSigningKeyPair("build854-auth-issuer");
    const anchorKey = generateTestSigningKeyPair("build854-auth-anchor");
    const statusSignerKey = generateTestSigningKeyPair("build854-auth-status");
    Object.assign(
      process.env,
      registryEnv(receiptKey, anchorKey, process.env),
      {
        ABRAXAS_STATUS_SIGNER_KEY_ID: statusSignerKey.signingKeyId,
        ABRAXAS_STATUS_SIGNER_PRIVATE_JWK: JSON.stringify(statusSignerKey.privateKeyJwk),
        ABRAXAS_STATUS_SIGNER_PUBLIC_JWK: JSON.stringify(statusSignerKey.publicKeyJwk),
        VERCEL_ENV: "development",
      },
    );

    const dbName = "abraxas_build854_auth";
    const admin = new pg.Pool({
      connectionString: `postgresql://postgres:postgres@127.0.0.1:5432/postgres`,
    });
    await admin.query(`drop database if exists "${dbName}"`);
    await admin.query(`create database "${dbName}"`);
    await admin.end();

    const url = `postgresql://postgres:postgres@127.0.0.1:5432/${dbName}`;
    process.env.ABRAXAS_SOVEREIGN_STAGING_PG_URL = url;
    process.env.ABRAXAS_DATABASE_URL = url;
    pool = new pg.Pool({ connectionString: url });
    await applySovereignSliceSchema(pool);

    kp = Keypair.generate();
    wallet = kp.publicKey.toBase58();
    subjectPseudonym = bindTrustExecutionSubjectPseudonym({
      partnerId: PARTNER,
      applicationId: APP_ID,
      walletAddress: wallet,
    });

    await pool.query(`insert into public.partners (partner_id, status) values ($1,'active')`, [PARTNER]);
    await pool.query(
      `insert into public.partner_policies (id, partner_id, version, name, rules_json, status)
       values ($1,$2,1,'auth-evidence','{}','active')`,
      [POLICY, PARTNER],
    );
    await pool.query(
      `insert into public.issuer_signing_keys (signing_key_id, status) values ($1,'active')`,
      [receiptKey.signingKeyId],
    );
    await pool.query(
      `insert into public.partner_launchpad_applications (id, partner_id, status, policy_id, policy_version)
       values ($1::uuid,$2,'active',$3,1)`,
      [APP_ID, PARTNER, POLICY],
    );
    await pool.query(
      `insert into public.sovereign_evidence_sources (source_credential_id, status, expires_at, revoked_at)
       values ($1,'active','2099-01-01T00:00:00.000Z', null)`,
      [SOURCE_ID],
    );
    await pool.query(
      `insert into public.sovereign_claim_status (claim_id, status, expires_at)
       values ($1,'active','2099-01-01T00:00:00.000Z')`,
      [CLAIM_ID],
    );
    await pool.query(
      `insert into public.wallet_scoped_trust_authoritative_evidence (
         partner_id, application_id, policy_id, policy_version, subject_pseudonym_id,
         source_credential_id, claim_id
       ) values ($1,$2::uuid,$3,1,$4,$5,$6)`,
      [PARTNER, APP_ID, POLICY, subjectPseudonym, SOURCE_ID, CLAIM_ID],
    );
  }, 120_000);

  afterAll(async () => {
    resetSovereignStagingPgPoolForTests();
    await pool?.end().catch(() => undefined);
  });

  async function authorizeOne() {
    const issued = await issuePartnerTrustExecutionChallenge({
      partnerId: PARTNER,
      applicationId: APP_ID,
      holderWalletAddress: wallet,
      origin: "https://ci.abraxas.test",
      uri: "https://ci.abraxas.test/trust",
      solanaNetwork: "devnet",
    });
    expect(issued.ok).toBe(true);
    if (!issued.ok) throw new Error("issue");
    const row = await loadScopedTrustChallenge(issued.challenge_id);
    const signature = signWalletScopedTrustMessage(row!.message, kp);
    const authorized = await authorizePartnerTrustExecution({
      challengeId: issued.challenge_id,
      walletAddress: wallet,
      signature,
      solanaNetwork: "devnet",
    });
    expect(authorized.ok).toBe(true);
    if (!authorized.ok) throw new Error("authorize");
    const loaded = await loadConsumedAuthorization({
      authorizationRef: authorized.authorization_ref,
      partnerId: PARTNER,
    });
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) throw new Error("load auth");
    return loaded.auth;
  }

  it("approves with real authorized sovereign evidence graph", async () => {
    const auth = await authorizeOne();
    const executed = await executeTrustExecutionAuthoritativeDecision({
      auth,
      partnerId: PARTNER,
      env: process.env,
    });
    if (!executed.ok) {
      throw new Error(`authoritative execute failed: ${executed.code} (${executed.decision_result ?? ""})`);
    }
    expect(executed.receipt.evaluated_claim_refs.length).toBeGreaterThan(0);
    expect(executed.verification_material.signed_issuer_authority).toBeTruthy();
    expect(executed.verification_material.signed_status_statement).toBeTruthy();

    const payload = buildCanonicalPayload({
      receipt_id: executed.receipt.id,
      decision_id: executed.receipt.verification_decision_id,
      policy_id: executed.receipt.policy_id,
      policy_version: executed.receipt.policy_version,
      partner_id: executed.receipt.partner_id,
      subject_pseudonym_id: executed.receipt.subject_pseudonym_id,
      wallet_binding_ref: executed.receipt.wallet_binding_ref,
      consent_receipt_id: executed.receipt.consent_receipt_id,
      decision_result: executed.receipt.decision_result,
      reason_codes: executed.receipt.reason_codes,
      evaluated_claim_refs: executed.receipt.evaluated_claim_refs,
      issuer_refs: executed.receipt.issuer_refs,
      decision_context: executed.receipt.decision_context,
      evaluated_at: executed.receipt.evaluated_at,
      expires_at: executed.receipt.expires_at,
    });
    expect(hashCanonicalPayload(payload)).toBe(executed.receipt.payload_hash);
    const pub = loadReceiptSigningKey()?.publicKeyJwk;
    expect(pub && verifyReceiptSignature(payload, executed.receipt.signature, pub)).toBe(true);

    const anchorPub = JSON.parse(process.env.ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PUBLIC_JWK ?? "{}") as JsonWebKey;
    const bundle = buildTrustAnchorBundleV1({
      anchorKeyId: "build834-trust-anchor",
      anchorPublicJwk: anchorPub,
      environment: "demo",
      statusStatementMaxAgeSeconds: 3600,
    });
    const independent = verifyAbraxasReceiptIndependently({
      record: executed.verification_material.portable_receipt,
      pinnedTrustAnchor: bundle,
      signedIssuerAuthority: executed.verification_material.signed_issuer_authority!,
      relyingParty: {
        partner_id: PARTNER,
        policy_id: POLICY,
        environment: "demo",
      },
      statementObservedAt: new Date().toISOString(),
      signedStatusStatement: executed.verification_material.signed_status_statement,
    });
    if (!independent.cryptographically_authentic) {
      throw new Error(`independent verify failed: ${independent.failure_codes.join(",")}`);
    }
  });

  it("fail-closes when authoritative evidence binding is missing", async () => {
    const auth = await authorizeOne();
    await pool.query(
      `delete from public.wallet_scoped_trust_authoritative_evidence where subject_pseudonym_id = $1`,
      [auth.subject_pseudonym_id],
    );
    const executed = await executeTrustExecutionAuthoritativeDecision({
      auth,
      partnerId: PARTNER,
      env: process.env,
    });
    expect(executed.ok).toBe(false);
    await pool.query(
      `insert into public.wallet_scoped_trust_authoritative_evidence (
         partner_id, application_id, policy_id, policy_version, subject_pseudonym_id,
         source_credential_id, claim_id
       ) values ($1,$2::uuid,$3,1,$4,$5,$6)
       on conflict do nothing`,
      [PARTNER, APP_ID, POLICY, subjectPseudonym, SOURCE_ID, CLAIM_ID],
    );
  });

  it("fail-closes on revoked source evidence", async () => {
    await pool.query(
      `update public.sovereign_evidence_sources set status = 'revoked', revoked_at = now() where source_credential_id = $1`,
      [SOURCE_ID],
    );
    const auth = await authorizeOne();
    const executed = await executeTrustExecutionAuthoritativeDecision({
      auth,
      partnerId: PARTNER,
      env: process.env,
    });
    expect(executed.ok).toBe(false);
    if (executed.ok) return;
    expect(executed.decision_result).toBe("denied");
    await pool.query(
      `update public.sovereign_evidence_sources set status = 'active', revoked_at = null where source_credential_id = $1`,
      [SOURCE_ID],
    );
  });

  it("preserves idempotency on concurrent authoritative execute", async () => {
    await pool.query(
      `insert into public.wallet_scoped_trust_authoritative_evidence (
         partner_id, application_id, policy_id, policy_version, subject_pseudonym_id,
         source_credential_id, claim_id
       ) values ($1,$2::uuid,$3,1,$4,$5,$6)
       on conflict do nothing`,
      [PARTNER, APP_ID, POLICY, subjectPseudonym, SOURCE_ID, CLAIM_ID],
    );
    const auth = await authorizeOne();
    const [a, b] = await Promise.all([
      executeTrustExecutionAuthoritativeDecision({ auth, partnerId: PARTNER, env: process.env }),
      executeTrustExecutionAuthoritativeDecision({ auth, partnerId: PARTNER, env: process.env }),
    ]);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.receipt.id).toBe(b.receipt.id);
    expect(a.receipt.signature).toBe(b.receipt.signature);
  });

  it("routes deployable execute to authoritative path when fixture gate is off", async () => {
    const auth = await authorizeOne();
    const executed = await executeTrustExecutionDecision({
      partnerId: PARTNER,
      authorizationRef: auth.wallet_binding_ref,
      controlledTestEvidence: false,
    });
    expect(executed.ok).toBe(true);
    if (!executed.ok) return;
    expect(executed.evidence_mode).toBe("live_authoritative_evidence");
  });
});
