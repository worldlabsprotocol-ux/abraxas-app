import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { caip10Evm } from "@/lib/auth/holderSubject/caip";
import { resolveSubjectForVerifiedWalletDirect } from "@/lib/persistence/holderSubjectDirect";
import { getActiveClaimsDirect, revokeSubjectClaimsDirect } from "@/lib/persistence/claimsDirectStore";
import { executeAdminReviewActionSovereign } from "@/lib/idv/adminReviewSovereign";
import {
  insertIdentityReviewSessionDirect,
  insertPassportDocumentDirect,
  recordIdvConsentDirect,
  registerEvidenceCustodyDirect,
} from "@/lib/persistence/idvDirectStore";
import { storeEncryptedEvidence } from "@/lib/persistence/evidenceBlobStore";
import { issueManualIdentityCredential } from "@/lib/idv/issueIdentityCredential";
import { verifyReceiptIndependently } from "@/lib/institutionalCertification/build546/independentVerifier";
import { DEMO_IDV_ACTIVATION_MANIFEST } from "@/lib/databaseRecovery/idvActivationManifest";
import { resetAbraxasPgPoolForTests } from "@/lib/persistence/pgPool";
import { resetPersistenceClientForTests } from "@/lib/persistence/admin";

const PG_URL = process.env.ABRAXAS_SOVEREIGN_PG_URL?.trim()
  || process.env.MIGRATION_136_PG_URL?.trim()
  || process.env.ABRAXAS_DATABASE_URL?.trim()
  || undefined;

const SCHEMA = [
  "006_abraxas_id.sql",
  "018_policy_verification.sql",
  "020_identity_verification_state_machine.sql",
  "136_passport_holder_subjects.sql",
  ...DEMO_IDV_ACTIVATION_MANIFEST,
  "078_age_evidence_records.sql",
  "138_sovereign_idv_evidence_custody.sql",
  "139_sovereign_idv_claims_evidence.sql",
];

describe("Build #555 sovereign passport completion", () => {
  if (!PG_URL) {
    it.skip("requires disposable PostgreSQL", () => {});
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
    evidenceDir = mkdtempSync(join(tmpdir(), "abx-b555-"));
    for (const k of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
      delete process.env[k];
    }
    process.env.ABRAXAS_PERSISTENCE_BACKEND = "postgres_direct";
    process.env.ABRAXAS_DATABASE_URL = PG_URL;
    process.env.ABRAXAS_EVIDENCE_STORAGE_ROOT = evidenceDir;
    process.env.ABRAXAS_EVIDENCE_ENCRYPTION_KEY = Buffer.alloc(32, 3).toString("base64");
    process.env.ABRAXAS_SIGNING_KEY = JSON.stringify(KEY.privateKeyJwk);
    resetAbraxasPgPoolForTests();
    resetPersistenceClientForTests();
  });

  afterEach(() => {
    rmSync(evidenceDir, { recursive: true, force: true });
    resetAbraxasPgPoolForTests();
    resetPersistenceClientForTests();
  });

  async function subject(): Promise<string> {
    const wallet = await resolveSubjectForVerifiedWalletDirect({
      caip: caip10Evm(11155111, `0x${randomBytes(20).toString("hex")}`),
      authMethod: "evm_wallet",
    });
    if (!wallet.ok) throw new Error("wallet");
    return wallet.subjectId;
  }

  it("admin approve requires custody evidence and persists claims", async () => {
    const holder = await subject();
    const captureSessionId = `cap_${randomBytes(8).toString("hex")}`;
    for (const kind of ["id_front", "selfie"] as const) {
      const stored = storeEncryptedEvidence({
        holderSubjectId: holder,
        captureSessionId,
        artifactKind: kind,
        plaintext: Buffer.from(kind),
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
    await recordIdvConsentDirect({
      holderSubjectId: holder,
      consentVersion: "1.0",
      consentScope: "identity_processing",
    });
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
      user_email: "h@test.local",
      holder_subject_id: holder,
      sui_address: null,
      stamp_id: "identity",
      file_name: "id_front.jpg",
      storage_path: "ignored",
      status: "under_review",
      document_type: "id_front",
      capture_session_id: captureSessionId,
      legal_name: "Test Holder",
    });

    const approved = await executeAdminReviewActionSovereign({
      documentId: doc.id,
      action: "approve",
      reviewerId: "reviewer@test.local",
      jurisdiction: "US-CA",
      documentType: "passport",
    });
    expect(approved.ok).toBe(true);
    if (!approved.ok || !approved.jti) return;
    const { countActiveClaimsForJtiDirect } = await import("@/lib/persistence/claimsDirectStore");
    expect(await countActiveClaimsForJtiDirect(holder, approved.jti)).toBeGreaterThan(0);
    const claims = await getActiveClaimsDirect(holder);
    expect(claims.length).toBeGreaterThan(0);
    expect(claims.every((c) => c.status === "active")).toBe(true);

    const replay = await issueManualIdentityCredential(holder, {
      reviewId: doc.id,
      captureSessionId,
    });
    expect(replay.ok).toBe(true);
    expect(replay.alreadyIssued).toBe(true);

    await revokeSubjectClaimsDirect(holder, "test_revocation", approved.jti);
    const afterRevoke = await getActiveClaimsDirect(holder);
    expect(afterRevoke.length).toBe(0);
  });

  it("blocks approval without required evidence custody", async () => {
    const holder = await subject();
    const captureSessionId = `cap_${randomBytes(8).toString("hex")}`;
    const doc = await insertPassportDocumentDirect({
      user_email: "h2@test.local",
      holder_subject_id: holder,
      stamp_id: "identity",
      file_name: "id_front.jpg",
      storage_path: "missing",
      status: "under_review",
      document_type: "id_front",
      capture_session_id: captureSessionId,
    });
    const result = await executeAdminReviewActionSovereign({
      documentId: doc.id,
      action: "approve",
      reviewerId: "reviewer@test.local",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(400);
  });

  it("independent receipt verification remains offline-capable", () => {
    const receipt = verifyReceiptIndependently({
      publicReceipt: {
        artifact_type: "eligibility_decision_receipt",
        receipt_id: "r-b555",
        partner_id: "p",
        policy_id: "pol",
        decision: "permit",
        issued_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        currently_valid: true,
        signature_valid: false,
      } as never,
      expectations: { partnerId: "p", policyId: "pol" },
      env: {},
    });
    expect(receipt.phases.length).toBeGreaterThan(0);
  });
});
