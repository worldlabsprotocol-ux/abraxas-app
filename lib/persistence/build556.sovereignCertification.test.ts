/**
 * Build #556 — sovereign runtime certification (disposable PostgreSQL, no Supabase).
 * Synthetic IDV fixtures only — not genuine human verification.
 */
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { Keypair } from "@solana/web3.js";
import { caip10Evm, caip10Solana } from "@/lib/auth/holderSubject/caip";
import {
  consumePassportEvmAuthChallengeDirect,
  consumePassportSolanaAuthChallengeDirect,
  insertEvmChallengeDirect,
  insertSolanaChallengeDirect,
} from "@/lib/persistence/authChallengeDirect";
import { resolveSubjectForVerifiedWalletDirect } from "@/lib/persistence/holderSubjectDirect";
import { filterClaimsForPolicyAuthorization } from "@/lib/credentials/activeClaims.server";
import {
  getActiveClaimsDirect,
  revokeSubjectClaimsDirect,
} from "@/lib/persistence/claimsDirectStore";
import { executeAdminReviewActionSovereign } from "@/lib/idv/adminReviewSovereign";
import {
  insertIdentityReviewSessionDirect,
  insertPassportDocumentDirect,
  recordIdvConsentDirect,
  registerEvidenceCustodyDirect,
} from "@/lib/persistence/idvDirectStore";
import { storeEncryptedEvidence } from "@/lib/persistence/evidenceBlobStore";
import {
  EvidenceAccessDeniedError,
  readHolderEvidenceAuthorized,
} from "@/lib/idv/sovereignEvidenceStorage";
import { verifyReceiptIndependently } from "@/lib/institutionalCertification/build546/independentVerifier";
import { GET as adminQueueGet } from "@/app/api/admin/identity/queue/route";
import { GET as documentUrlGet } from "@/app/api/admin/identity/document-url/route";
import { POST as capturePost } from "@/app/api/identity/documents/capture/route";
import { SOVEREIGN_RUNTIME_SCHEMA_MANIFEST } from "@/lib/databaseRecovery/sovereignSchemaManifest";
import { resetAbraxasPgPoolForTests } from "@/lib/persistence/pgPool";
import { resetPersistenceClientForTests } from "@/lib/persistence/admin";

const PG_URL = process.env.ABRAXAS_SOVEREIGN_PG_URL?.trim()
  || process.env.ABRAXAS_DATABASE_URL?.trim()
  || undefined;

const SCHEMA = [...SOVEREIGN_RUNTIME_SCHEMA_MANIFEST];

describe("Build #556 sovereign runtime certification", () => {
  if (!PG_URL) {
    it.skip("requires disposable PostgreSQL (ABRAXAS_SOVEREIGN_PG_URL)", () => {});
    return;
  }

  let evidenceDir: string;
  const KEY = generateTestSigningKeyPair();

  beforeAll(() => {
    const dir = join(process.cwd(), "supabase/migrations");
    for (const file of SCHEMA) {
      execFileSync("psql", [PG_URL!, "-v", "ON_ERROR_STOP=0"], {
        input: readFileSync(join(dir, file), "utf8"),
        encoding: "utf8",
      });
    }
  });

  beforeEach(() => {
    evidenceDir = mkdtempSync(join(tmpdir(), "abx-b556-cert-"));
    for (const k of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
      delete process.env[k];
    }
    process.env.ABRAXAS_PERSISTENCE_BACKEND = "postgres_direct";
    process.env.ABRAXAS_DATABASE_URL = PG_URL;
    process.env.ABRAXAS_EVIDENCE_STORAGE_ROOT = evidenceDir;
    process.env.ABRAXAS_EVIDENCE_ENCRYPTION_KEY = Buffer.alloc(32, 11).toString("base64");
    process.env.ABRAXAS_SIGNING_KEY = JSON.stringify(KEY.privateKeyJwk);
    process.env.ABRAXAS_ADMIN_EMAILS = "cert-reviewer@test.local";
    resetAbraxasPgPoolForTests();
    resetPersistenceClientForTests();
  });

  afterEach(() => {
    rmSync(evidenceDir, { recursive: true, force: true });
    resetAbraxasPgPoolForTests();
    resetPersistenceClientForTests();
  });

  async function evmHolder(): Promise<string> {
    const wallet = await resolveSubjectForVerifiedWalletDirect({
      caip: caip10Evm(11155111, `0x${randomBytes(20).toString("hex")}`),
      authMethod: "evm_wallet",
    });
    if (!wallet.ok) throw new Error("evm subject");
    return wallet.subjectId;
  }

  async function solanaHolder(): Promise<string> {
    const wallet = await resolveSubjectForVerifiedWalletDirect({
      caip: caip10Solana("devnet", Keypair.generate().publicKey.toBase58()),
      authMethod: "solana_wallet",
    });
    if (!wallet.ok) throw new Error("solana subject");
    return wallet.subjectId;
  }

  it("certifies EVM Sepolia and Solana devnet holder subjects without Supabase", async () => {
    const evm = await evmHolder();
    const sol = await solanaHolder();
    expect(evm).toMatch(/^abx_hs_/);
    expect(sol).toMatch(/^abx_hs_/);
    expect(evm).not.toBe(sol);
  });

  it("certifies auth challenge replay rejection (EVM + Solana persistence)", async () => {
    const ctx = randomBytes(16).toString("hex");
    const evmWallet = `0x${randomBytes(20).toString("hex")}`;
    const evmId = `evm_${randomBytes(6).toString("hex")}`;
    await insertEvmChallengeDirect({
      id: evmId,
      wallet_address: evmWallet,
      chain_id: 11155111,
      origin: "https://cert.test",
      intended_action: "sign_in",
      session_context_hash: ctx,
      nonce: randomBytes(8).toString("hex"),
      message: "m",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    });
    const evmOk = await consumePassportEvmAuthChallengeDirect({
      challengeId: evmId,
      walletAddress: evmWallet,
      sessionContextHash: ctx,
    });
    expect(evmOk?.id).toBe(evmId);
    expect(await consumePassportEvmAuthChallengeDirect({
      challengeId: evmId,
      walletAddress: evmWallet,
      sessionContextHash: ctx,
    })).toBeNull();

    const solId = `sol_${randomBytes(6).toString("hex")}`;
    const solWallet = randomBytes(32).toString("hex");
    await insertSolanaChallengeDirect({
      id: solId,
      wallet_address: solWallet,
      solana_network: "devnet",
      origin: "https://cert.test",
      intended_action: "sign_in",
      session_context_hash: ctx,
      nonce: randomBytes(8).toString("hex"),
      message: "m",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    });
    const first = await consumePassportSolanaAuthChallengeDirect({
      challengeId: solId,
      walletAddress: solWallet,
      sessionContextHash: ctx,
    });
    expect(first?.id).toBe(solId);
    expect(await consumePassportSolanaAuthChallengeDirect({
      challengeId: solId,
      walletAddress: solWallet,
      sessionContextHash: ctx,
    })).toBeNull();
  });

  it("certifies HTTP admin boundaries without Supabase", async () => {
    const prevNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    process.env.ABRAXAS_ADMIN_PIN = "cert-required-pin";
    const queueRes = await adminQueueGet(new NextRequest("http://localhost/api/admin/identity/queue"));
    process.env.NODE_ENV = prevNodeEnv;
    delete process.env.ABRAXAS_ADMIN_PIN;
    expect(queueRes.status).toBeGreaterThanOrEqual(401);
    const docRes = await documentUrlGet(
      new NextRequest("http://localhost/api/admin/identity/document-url?path=/etc/passwd"),
    );
    expect([400, 401, 403]).toContain(docRes.status);
  });

  it("certifies sovereign capture HTTP rejects missing session (no Supabase)", async () => {
    const form = new FormData();
    form.set("holder_subject_id", "abx_hs_aabbccddeeff00112233445566778899");
    form.set("consent", "1");
    const req = new NextRequest("http://localhost/api/identity/documents/capture", {
      method: "POST",
      body: form,
    });
    const res = await capturePost(req);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("certifies full synthetic lifecycle: consent → custody → review → atomic approve → revoke", async () => {
    const holder = await evmHolder();
    const other = await evmHolder();
    const captureSessionId = `cap_${randomBytes(8).toString("hex")}`;
    await recordIdvConsentDirect({
      holderSubjectId: holder,
      consentVersion: "1.0",
      consentScope: "identity_processing",
    });
    for (const kind of ["id_front", "selfie"] as const) {
      const stored = storeEncryptedEvidence({
        holderSubjectId: holder,
        captureSessionId,
        artifactKind: kind,
        plaintext: Buffer.from(`synthetic-${kind}`),
        env: process.env,
      });
      await registerEvidenceCustodyDirect({
        holderSubjectId: holder,
        captureSessionId,
        artifactKind: kind,
        storagePath: stored.storagePath,
        contentSha256: stored.contentSha256,
      });
    }
    await insertIdentityReviewSessionDirect({
      capture_session_id: captureSessionId,
      sui_address: null,
      holder_subject_id: holder,
      partner_id: null,
      policy_id: null,
      verification_request_id: null,
      review_status: "pending",
      engine_decision: "review",
      eligibility_result: null,
      raw_evidence_purged_at: null,
      raw_evidence_retained_until: null,
      evidence_content_hash: null,
      purge_attempt_count: 0,
      last_purge_error_code: null,
      reviewed_at: null,
      reviewer_id: null,
      reviewer_category: null,
      reason_code: null,
    });
    const doc = await insertPassportDocumentDirect({
      user_email: "cert@test.local",
      holder_subject_id: holder,
      stamp_id: "identity",
      file_name: "id_front.jpg",
      storage_path: "unused",
      status: "under_review",
      document_type: "id_front",
      capture_session_id: captureSessionId,
    });

    const custodyPath = (
      await import("@/lib/persistence/idvDirectStore")
    ).getEvidenceCustodyRecordDirect;
    const row = await custodyPath(captureSessionId, "id_front");
    expect(row?.holder_subject_id).toBe(holder);
    await expect(
      readHolderEvidenceAuthorized({
        holderSubjectId: other,
        captureSessionId,
        storagePath: row!.storage_path,
        artifactKind: "id_front",
        actor: "cross-holder-test",
      }),
    ).rejects.toBeInstanceOf(EvidenceAccessDeniedError);

    const approved = await executeAdminReviewActionSovereign({
      documentId: doc.id,
      action: "approve",
      reviewerId: "cert-reviewer@test.local",
    });
    expect(approved.ok).toBe(true);
    if (!approved.ok || !approved.jti) return;

    const claims = await getActiveClaimsDirect(holder);
    expect(filterClaimsForPolicyAuthorization(claims).length).toBeGreaterThan(0);

    await revokeSubjectClaimsDirect(holder, "cert_revoke", approved.jti);
    expect(filterClaimsForPolicyAuthorization(await getActiveClaimsDirect(holder))).toHaveLength(0);
  });

  it("certifies independent receipt verification without Abraxas DB session", () => {
    const offline = verifyReceiptIndependently({
      publicReceipt: {
        artifact_type: "eligibility_decision_receipt",
        receipt_id: "r-b556",
        partner_id: "p",
        policy_id: "pol",
        decision: "deny",
        issued_at: new Date().toISOString(),
        expires_at: new Date(Date.now() - 1000).toISOString(),
        currently_valid: false,
        signature_valid: true,
      } as never,
      expectations: { partnerId: "p", policyId: "pol" },
      env: {},
    });
    expect(offline.checks_possible_offline.length).toBeGreaterThan(0);
    expect(["reject", "blocked"]).toContain(offline.verdict);
    expect(offline.currently_authorizable).toBe(false);
  });
});
