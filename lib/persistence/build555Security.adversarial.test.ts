import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { caip10Evm } from "@/lib/auth/holderSubject/caip";
import { filterClaimsForPolicyAuthorization } from "@/lib/credentials/activeClaims.server";
import { resolveSubjectForVerifiedWalletDirect } from "@/lib/persistence/holderSubjectDirect";
import {
  countActiveClaimsForJtiDirect,
  getActiveClaimsDirect,
  revokeSubjectClaimsDirect,
} from "@/lib/persistence/claimsDirectStore";
import { executeAdminReviewActionSovereign } from "@/lib/idv/adminReviewSovereign";
import {
  insertIdentityReviewSessionDirect,
  insertPassportDocumentDirect,
  registerEvidenceCustodyDirect,
} from "@/lib/persistence/idvDirectStore";
import { storeEncryptedEvidence } from "@/lib/persistence/evidenceBlobStore";
import { issueManualIdentityCredential } from "@/lib/idv/issueIdentityCredential";
import { GET as documentUrlGet } from "@/app/api/admin/identity/document-url/route";
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

describe("Build #555 security correction — adversarial", () => {
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
    evidenceDir = mkdtempSync(join(tmpdir(), "abx-b555-sec-"));
    for (const k of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
      delete process.env[k];
    }
    process.env.ABRAXAS_PERSISTENCE_BACKEND = "postgres_direct";
    process.env.ABRAXAS_DATABASE_URL = PG_URL;
    process.env.ABRAXAS_EVIDENCE_STORAGE_ROOT = evidenceDir;
    process.env.ABRAXAS_EVIDENCE_ENCRYPTION_KEY = Buffer.alloc(32, 5).toString("base64");
    process.env.ABRAXAS_SIGNING_KEY = JSON.stringify(KEY.privateKeyJwk);
    resetAbraxasPgPoolForTests();
    resetPersistenceClientForTests();
  });

  afterEach(() => {
    rmSync(evidenceDir, { recursive: true, force: true });
    resetAbraxasPgPoolForTests();
    resetPersistenceClientForTests();
  });

  async function holderSubject(): Promise<string> {
    const wallet = await resolveSubjectForVerifiedWalletDirect({
      caip: caip10Evm(11155111, `0x${randomBytes(20).toString("hex")}`),
      authMethod: "evm_wallet",
    });
    if (!wallet.ok) throw new Error("wallet");
    return wallet.subjectId;
  }

  async function seedReviewDoc(holder: string): Promise<{ docId: string; captureSessionId: string }> {
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
    const doc = await insertPassportDocumentDirect({
      user_email: "sec@test.local",
      holder_subject_id: holder,
      stamp_id: "identity",
      file_name: "id_front.jpg",
      storage_path: "unused",
      status: "under_review",
      document_type: "id_front",
      capture_session_id: captureSessionId,
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
    return { docId: doc.id, captureSessionId };
  }

  it("credential-scoped revocation targets JTI-bound claims", async () => {
    const holder = await holderSubject();
    const { docId, captureSessionId } = await seedReviewDoc(holder);
    const approved = await executeAdminReviewActionSovereign({
      documentId: docId,
      action: "approve",
      reviewerId: "reviewer@test.local",
    });
    expect(approved.ok).toBe(true);
    if (!approved.ok || !approved.jti) return;
    expect(await countActiveClaimsForJtiDirect(holder, approved.jti)).toBeGreaterThan(0);
    await revokeSubjectClaimsDirect(holder, "scoped_revoke", approved.jti);
    expect(await countActiveClaimsForJtiDirect(holder, approved.jti)).toBe(0);
    expect(await getActiveClaimsDirect(holder).then((c) => c.length)).toBe(0);
  });

  it("serializes concurrent approve on one capture session", async () => {
    const holder = await holderSubject();
    const { docId } = await seedReviewDoc(holder);

    const [a, b] = await Promise.all([
      executeAdminReviewActionSovereign({
        documentId: docId,
        action: "approve",
        reviewerId: "reviewer-a@test.local",
      }),
      executeAdminReviewActionSovereign({
        documentId: docId,
        action: "reject",
        reviewerId: "reviewer-b@test.local",
      }),
    ]);
    const successes = [a, b].filter((r) => r.ok);
    expect(successes.length).toBe(1);
    expect([a, b].some((r) => !r.ok && (r.status === 409 || r.alreadyIssued))).toBe(true);
  });

  it("rejects revoked and low-assurance claims for policy authorization", () => {
    const filtered = filterClaimsForPolicyAuthorization([
      {
        id: "1",
        subject_id: "abx_hs_aabbccddeeff00112233445566778899",
        credential_jti: "j1",
        claim_type: "identity_verified",
        claim_value: {},
        issuer_id: "i",
        assurance_level: "L1",
        issued_at: new Date().toISOString(),
        expires_at: null,
        status: "active",
        revocation_reference: null,
        evidence_reference: null,
        jurisdiction: null,
        policy_scope: null,
      },
      {
        id: "2",
        subject_id: "abx_hs_aabbccddeeff00112233445566778899",
        credential_jti: "j2",
        claim_type: "identity_verified",
        claim_value: {},
        issuer_id: "i",
        assurance_level: "L2",
        issued_at: new Date().toISOString(),
        expires_at: new Date(Date.now() - 60_000).toISOString(),
        status: "active",
        revocation_reference: null,
        evidence_reference: null,
        jurisdiction: null,
        policy_scope: null,
      },
    ]);
    expect(filtered.length).toBe(0);
  });

  it("document-url HTTP rejects unauthenticated sovereign access", async () => {
    const req = new NextRequest(
      "http://localhost/api/admin/identity/document-url?capture_session_id=cap_x&artifact_kind=id_front",
    );
    const res = await documentUrlGet(req);
    expect(res.status).toBeGreaterThanOrEqual(401);
  });

  it("document-url HTTP rejects path-only sovereign access", async () => {
    process.env.ABRAXAS_ADMIN_EMAILS = "admin@test.local";
    const req = new NextRequest(
      "http://localhost/api/admin/identity/document-url?path=/etc/passwd",
    );
    const res = await documentUrlGet(req);
    expect([400, 401, 403]).toContain(res.status);
  });
});
