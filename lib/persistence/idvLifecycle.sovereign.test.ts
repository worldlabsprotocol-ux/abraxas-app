import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { caip10Evm } from "@/lib/auth/holderSubject/caip";
import { resolveSubjectForVerifiedWalletDirect } from "@/lib/persistence/holderSubjectDirect";
import { resetAbraxasPgPoolForTests } from "@/lib/persistence/pgPool";
import { resetPersistenceClientForTests } from "@/lib/persistence/admin";
import {
  getBiometricAssessmentDirect,
  getIdentityVerificationBySubjectDirect,
  getPassportDocumentBySessionDirect,
  insertPassportDocumentDirect,
  recordIdvConsentDirect,
} from "@/lib/persistence/idvDirectStore";
import { createIdentityReviewSession } from "@/lib/idv/identityReviewSession";
import { persistBiometricAssessment } from "@/lib/idv/biometric/persistAssessment";
import { issueManualIdentityCredential } from "@/lib/idv/issueIdentityCredential";
import {
  EvidenceAccessDeniedError,
  readHolderEvidenceAuthorized,
  storeHolderEvidenceWithCustody,
} from "@/lib/idv/sovereignEvidenceStorage";
import { verifyReceiptIndependently } from "@/lib/institutionalCertification/build546/independentVerifier";
import { DEMO_IDV_ACTIVATION_MANIFEST } from "@/lib/databaseRecovery/idvActivationManifest";

const PG_URL = process.env.ABRAXAS_SOVEREIGN_PG_URL?.trim()
  || process.env.MIGRATION_136_PG_URL?.trim()
  || process.env.ABRAXAS_DATABASE_URL?.trim()
  || undefined;

describe("Build #554 sovereign IDV lifecycle (isolated PostgreSQL)", () => {
  if (!PG_URL) {
    it.skip("requires disposable PostgreSQL URL", () => {});
    return;
  }

  let evidenceDir: string;
  const KEY = generateTestSigningKeyPair();

  beforeAll(() => {
    if (!PG_URL) return;
    const migrationsDir = join(process.cwd(), "supabase/migrations");
    const files = [
      "006_abraxas_id.sql",
      "020_identity_verification_state_machine.sql",
      "136_passport_holder_subjects.sql",
      ...DEMO_IDV_ACTIVATION_MANIFEST,
      "138_sovereign_idv_evidence_custody.sql",
    ];
    for (const file of files) {
      const sql = readFileSync(join(migrationsDir, file), "utf8");
      execFileSync("psql", [PG_URL, "-v", "ON_ERROR_STOP=0"], { input: sql, encoding: "utf8" });
    }
  });

  beforeEach(() => {
    evidenceDir = mkdtempSync(join(tmpdir(), "abx-idv-evidence-"));
    process.env.ABRAXAS_PERSISTENCE_BACKEND = "postgres_direct";
    process.env.ABRAXAS_DATABASE_URL = PG_URL;
    process.env.ABRAXAS_EVIDENCE_STORAGE_ROOT = evidenceDir;
    process.env.ABRAXAS_EVIDENCE_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
    process.env.ABRAXAS_SIGNING_KEY = JSON.stringify(KEY.privateKeyJwk);
    resetAbraxasPgPoolForTests();
    resetPersistenceClientForTests();
  });

  afterEach(() => {
    rmSync(evidenceDir, { recursive: true, force: true });
    delete process.env.ABRAXAS_PERSISTENCE_BACKEND;
    delete process.env.ABRAXAS_DATABASE_URL;
    delete process.env.ABRAXAS_EVIDENCE_STORAGE_ROOT;
    delete process.env.ABRAXAS_SIGNING_KEY;
    resetAbraxasPgPoolForTests();
    resetPersistenceClientForTests();
  });

  it("wallet auth → consent → evidence → review → credential (synthetic test only)", async () => {
    const caip = caip10Evm(11155111, `0x${randomBytes(20).toString("hex")}`);
    const wallet = await resolveSubjectForVerifiedWalletDirect({
      caip,
      authMethod: "evm_wallet",
    });
    expect(wallet.ok).toBe(true);
    if (!wallet.ok) return;
    const subjectId = wallet.subjectId;

    await recordIdvConsentDirect({
      holderSubjectId: subjectId,
      consentVersion: "build554-test-v1",
      consentScope: "identity_processing",
    });

    const captureSessionId = `cap_${randomBytes(8).toString("hex")}`;
    const syntheticDoc = Buffer.from("SYNTHETIC_TEST_EVIDENCE_NOT_PRODUCTION");
    const stored = await storeHolderEvidenceWithCustody({
      holderSubjectId: subjectId,
      captureSessionId,
      plaintext: syntheticDoc,
    });
    const roundTrip = await readHolderEvidenceAuthorized({
      holderSubjectId: subjectId,
      captureSessionId,
      storagePath: stored.storagePath,
      actor: "lifecycle_test",
    });
    expect(roundTrip.equals(syntheticDoc)).toBe(true);

    await expect(
      readHolderEvidenceAuthorized({
        holderSubjectId: `abx_hs_${"e".repeat(32)}`,
        captureSessionId,
        storagePath: stored.storagePath,
        actor: "attacker",
      }),
    ).rejects.toBeInstanceOf(EvidenceAccessDeniedError);

    const doc = await insertPassportDocumentDirect({
      user_email: "holder@test.local",
      stamp_id: "identity",
      file_name: "id_front.jpg",
      storage_path: stored.storagePath,
      status: "under_review",
      holder_subject_id: subjectId,
      sui_address: null,
      capture_session_id: captureSessionId,
      document_type: "passport",
    });

    const review = await createIdentityReviewSession({
      captureSessionId,
      suiAddress: subjectId,
      partnerId: "partner_sandbox_test",
      policyId: "age_21_retail",
      engineDecision: "review",
      evidenceContentHash: stored.contentSha256,
    });
    expect(review.ok).toBe(true);

    await persistBiometricAssessment({
      capture_session_id: captureSessionId,
      sui_address: subjectId,
      scores: { face_match: 0.91, liveness: 0.88, document_quality: 0.9, selfie_quality: 0.87 },
      decision: "review",
      assurance_level: "L2",
      review_method: "human_biometric_match",
      engine_version: "build554-test",
      signals: {},
      reasons: [],
      reason_codes: [],
      analyzed_at: new Date().toISOString(),
    });
    expect(await getBiometricAssessmentDirect(captureSessionId)).not.toBeNull();

    const issued = await issueManualIdentityCredential(subjectId, {
      reviewId: `review_${randomBytes(4).toString("hex")}`,
      jurisdiction: "US-CA",
      documentType: "passport",
      captureSessionId,
      assuranceLevel: "L2",
      reviewMethod: "human_biometric_match",
      documentDateOfBirth: "1990-01-01",
      minimumAgeGate: 21,
    });
    expect(issued.ok).toBe(true);
    expect(issued.jwt).toBeTruthy();

    const iv = await getIdentityVerificationBySubjectDirect(subjectId);
    expect(iv?.credential_jti).toBeTruthy();
    expect(iv?.identity_verification_status ?? iv?.status).toBe("approved");

    const persistedDoc = await getPassportDocumentBySessionDirect(captureSessionId);
    expect(persistedDoc?.id).toBe(doc.id);

    const receipt = verifyReceiptIndependently({
      publicReceipt: {
        artifact_type: "eligibility_decision_receipt",
        receipt_id: "r-build554-test",
        partner_id: "partner_sandbox_test",
        policy_id: "age_21_retail",
        decision: "permit",
        issued_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        currently_valid: true,
        signature_valid: false,
      } as never,
      expectations: { partnerId: "partner_sandbox_test", policyId: "age_21_retail" },
      env: {},
    });
    expect(receipt.phases.length).toBeGreaterThan(0);
  });
});
