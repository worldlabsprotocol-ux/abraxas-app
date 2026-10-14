import { randomBytes, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { caip10Evm } from "@/lib/auth/holderSubject/caip";
import { resolveSubjectForVerifiedWalletDirect } from "@/lib/persistence/holderSubjectDirect";
import { countActiveClaimsForJtiDirect } from "@/lib/persistence/claimsDirectStore";
import {
  commitSovereignCredentialIssuanceDirect,
} from "@/lib/persistence/sovereignCredentialIssuance";
import {
  EvidenceCustodyConflictError,
  registerEvidenceCustodyDirect,
} from "@/lib/persistence/idvDirectStore";
import { issueManualIdentityCredential } from "@/lib/idv/issueIdentityCredential";
import {
  EvidenceAccessDeniedError,
  readHolderEvidenceAuthorized,
  storeHolderEvidenceWithCustody,
} from "@/lib/idv/sovereignEvidenceStorage";
import { storeEncryptedEvidence, readEncryptedEvidence } from "@/lib/persistence/evidenceBlobStore";
import { queryAbraxasPg, resetAbraxasPgPoolForTests } from "@/lib/persistence/pgPool";
import { resetPersistenceClientForTests } from "@/lib/persistence/admin";
import { manualApprovedClaims } from "@/lib/credentials/claimSchema";
import { DEMO_IDV_ACTIVATION_MANIFEST } from "@/lib/databaseRecovery/idvActivationManifest";

const PG_URL = process.env.ABRAXAS_SOVEREIGN_PG_URL?.trim()
  || process.env.MIGRATION_136_PG_URL?.trim()
  || process.env.ABRAXAS_DATABASE_URL?.trim()
  || undefined;

const SOVEREIGN_SCHEMA_FILES = [
  "006_abraxas_id.sql",
  "018_policy_verification.sql",
  "020_identity_verification_state_machine.sql",
  "136_passport_holder_subjects.sql",
  ...DEMO_IDV_ACTIVATION_MANIFEST,
  "138_sovereign_idv_evidence_custody.sql",
  "139_sovereign_idv_claims_evidence.sql",
];

function unsetSupabaseEnv(): void {
  for (const key of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_ANON_KEY",
  ]) {
    delete process.env[key];
  }
}

describe("Build #554 sovereign IDV issuance — adversarial (disposable PG, no Supabase)", () => {
  if (!PG_URL) {
    it.skip("requires disposable PostgreSQL URL", () => {});
    return;
  }

  let evidenceDir: string;
  const KEY = generateTestSigningKeyPair();

  beforeAll(() => {
    const migrationsDir = join(process.cwd(), "supabase/migrations");
    for (const file of SOVEREIGN_SCHEMA_FILES) {
      const sql = readFileSync(join(migrationsDir, file), "utf8");
      execFileSync("psql", [PG_URL!, "-v", "ON_ERROR_STOP=0"], { input: sql, encoding: "utf8" });
    }
  });

  beforeEach(() => {
    evidenceDir = mkdtempSync(join(tmpdir(), "abx-idv-adv-"));
    unsetSupabaseEnv();
    process.env.ABRAXAS_PERSISTENCE_BACKEND = "postgres_direct";
    process.env.ABRAXAS_DATABASE_URL = PG_URL;
    process.env.ABRAXAS_EVIDENCE_STORAGE_ROOT = evidenceDir;
    process.env.ABRAXAS_EVIDENCE_ENCRYPTION_KEY = Buffer.alloc(32, 11).toString("base64");
    process.env.ABRAXAS_SIGNING_KEY = JSON.stringify(KEY.privateKeyJwk);
    resetAbraxasPgPoolForTests();
    resetPersistenceClientForTests();
  });

  afterEach(() => {
    rmSync(evidenceDir, { recursive: true, force: true });
    unsetSupabaseEnv();
    delete process.env.ABRAXAS_PERSISTENCE_BACKEND;
    delete process.env.ABRAXAS_DATABASE_URL;
    delete process.env.ABRAXAS_EVIDENCE_STORAGE_ROOT;
    delete process.env.ABRAXAS_SIGNING_KEY;
    resetAbraxasPgPoolForTests();
    resetPersistenceClientForTests();
  });

  async function freshSubject(): Promise<string> {
    const caip = caip10Evm(11155111, `0x${randomBytes(20).toString("hex")}`);
    const wallet = await resolveSubjectForVerifiedWalletDirect({
      caip,
      authMethod: "evm_wallet",
    });
    expect(wallet.ok).toBe(true);
    if (!wallet.ok) throw new Error("subject");
    return wallet.subjectId;
  }

  it("rejects issuance commit with zero claims", async () => {
    const subjectId = await freshSubject();
    const result = await commitSovereignCredentialIssuanceDirect({
      subjectKey: subjectId,
      jti: `urn:uuid:${randomUUID()}`,
      credentialJwt: "jwt",
      issuer: "did:web:test",
      jurisdiction: "US",
      documentType: "passport",
      verificationPatch: { identity_verification_status: "approved", credential_status: "active" },
      eventSource: "adversarial_test",
      expirationDateIso: new Date(Date.now() + 86400000).toISOString(),
      claims: [],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("claims_required");
  });

  it("serializes concurrent issuance under advisory lock", async () => {
    const subjectId = await freshSubject();
    const expiresAt = new Date(Date.now() + 86400000);
    const baseClaims = manualApprovedClaims({
      subjectId,
      jti: "placeholder",
      jurisdiction: "US-CA",
      documentType: "passport",
      reviewId: "review_adv",
      expiresAt,
    });

    const mkCommit = (jti: string) => commitSovereignCredentialIssuanceDirect({
      subjectKey: subjectId,
      jti,
      credentialJwt: `jwt-${jti}`,
      issuer: "did:web:test",
      jurisdiction: "US-CA",
      documentType: "passport",
      verificationPatch: {
        identity_verification_status: "approved",
        credential_status: "active",
        credential_jti: jti,
      },
      eventSource: "concurrent_adversarial",
      expirationDateIso: expiresAt.toISOString(),
      claims: baseClaims.map((c) => ({ ...c, credential_jti: jti })),
    });

    const jtiA = `urn:uuid:${randomUUID()}`;
    const jtiB = `urn:uuid:${randomUUID()}`;
    const [a, b] = await Promise.all([mkCommit(jtiA), mkCommit(jtiB)]);
    const outcomes = [a, b].map((r) => (r.ok ? "committed" : r.code));
    expect(outcomes.filter((o) => o === "committed").length).toBe(1);
    expect(outcomes.filter((o) => o === "credential_already_active").length).toBe(1);

    const audit = await queryAbraxasPg<{ outcome: string }>(
      `select outcome from public.sovereign_credential_issuance_audit
       where holder_subject_id = $1 order by created_at desc`,
      [subjectId],
    );
    expect(audit.rows.some((r) => r.outcome === "committed")).toBe(true);
    expect(audit.rows.some((r) => r.outcome === "rejected_duplicate")).toBe(true);
  });

  it("issueManualIdentityCredential persists active claims or fails closed", async () => {
    const subjectId = await freshSubject();
    const issued = await issueManualIdentityCredential(subjectId, {
      reviewId: `review_${randomBytes(4).toString("hex")}`,
      jurisdiction: "US-CA",
      documentType: "passport",
      documentDateOfBirth: "1990-06-15",
      minimumAgeGate: 21,
    });
    expect(issued.ok).toBe(true);
    if (!issued.ok || !issued.jti) return;
    const count = await countActiveClaimsForJtiDirect(subjectId, issued.jti);
    expect(count).toBeGreaterThan(0);
  });

  it("stores id_front and selfie without custody overwrite", async () => {
    const subjectId = await freshSubject();
    const captureSessionId = `cap_${randomBytes(8).toString("hex")}`;
    const front = await storeHolderEvidenceWithCustody({
      holderSubjectId: subjectId,
      captureSessionId,
      artifactKind: "id_front",
      plaintext: Buffer.from("ID_FRONT_SIM"),
    });
    const selfie = await storeHolderEvidenceWithCustody({
      holderSubjectId: subjectId,
      captureSessionId,
      artifactKind: "selfie",
      plaintext: Buffer.from("SELFIE_SIM"),
    });
    expect(front.storagePath).not.toBe(selfie.storagePath);
    const readFront = await readHolderEvidenceAuthorized({
      holderSubjectId: subjectId,
      captureSessionId,
      storagePath: front.storagePath,
      artifactKind: "id_front",
      actor: "test",
    });
    expect(readFront.toString()).toBe("ID_FRONT_SIM");
  });

  it("rejects duplicate capture custody for another holder", async () => {
    const subjectA = await freshSubject();
    const subjectB = await freshSubject();
    const captureSessionId = `cap_${randomBytes(8).toString("hex")}`;
    const stored = storeEncryptedEvidence({
      holderSubjectId: subjectA,
      captureSessionId,
      artifactKind: "id_front",
      plaintext: Buffer.from("x"),
      env: process.env,
    });
    await registerEvidenceCustodyDirect({
      holderSubjectId: subjectA,
      captureSessionId,
      artifactKind: "id_front",
      storagePath: stored.storagePath,
      contentSha256: stored.contentSha256,
    });
    await expect(
      registerEvidenceCustodyDirect({
        holderSubjectId: subjectB,
        captureSessionId,
        artifactKind: "id_front",
        storagePath: stored.storagePath,
        contentSha256: stored.contentSha256,
      }),
    ).rejects.toBeInstanceOf(EvidenceCustodyConflictError);
  });

  it("denies cross-holder evidence read", async () => {
    const subjectId = await freshSubject();
    const captureSessionId = `cap_${randomBytes(8).toString("hex")}`;
    const stored = await storeHolderEvidenceWithCustody({
      holderSubjectId: subjectId,
      captureSessionId,
      artifactKind: "bundle",
      plaintext: Buffer.from("secret"),
    });
    await expect(
      readHolderEvidenceAuthorized({
        holderSubjectId: `abx_hs_${"f".repeat(32)}`,
        captureSessionId,
        storagePath: stored.storagePath,
        artifactKind: "bundle",
        actor: "attacker",
      }),
    ).rejects.toBeInstanceOf(EvidenceAccessDeniedError);
  });

  it("fails decrypt on corrupted ciphertext", async () => {
    const subjectId = await freshSubject();
    const captureSessionId = `cap_${randomBytes(8).toString("hex")}`;
    const stored = storeEncryptedEvidence({
      holderSubjectId: subjectId,
      captureSessionId,
      plaintext: Buffer.from("good"),
      env: process.env,
    });
    writeFileSync(stored.storagePath, Buffer.from("corrupt"));
    expect(() => readEncryptedEvidence({ storagePath: stored.storagePath, env: process.env })).toThrow();
  });

  it("requires durable evidence root under postgres_direct", () => {
    expect(() =>
      storeEncryptedEvidence({
        holderSubjectId: "abx_hs_aabbccddeeff00112233445566778899",
        captureSessionId: "cap_x",
        plaintext: Buffer.from("x"),
        env: {
          ABRAXAS_PERSISTENCE_BACKEND: "postgres_direct",
          ABRAXAS_EVIDENCE_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString("base64"),
        },
      }),
    ).toThrow(/ABRAXAS_EVIDENCE_STORAGE_ROOT/);
  });
});
