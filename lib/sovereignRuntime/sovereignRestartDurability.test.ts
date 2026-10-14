/**
 * Portable runtime — signing authority and encrypted evidence survive pool reset (restart surrogate).
 */
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { storeEncryptedEvidence, readEncryptedEvidence } from "@/lib/persistence/evidenceBlobStore";
import { resetAbraxasPgPoolForTests } from "@/lib/persistence/pgPool";
import { resetPersistenceClientForTests } from "@/lib/persistence/admin";
import {
  signingPublicFingerprintSha256,
} from "./sovereignOperationalReadiness";

const PG = process.env.ABRAXAS_DATABASE_URL?.trim() || process.env.ABRAXAS_SOVEREIGN_PG_URL?.trim();

describe("sovereign restart durability (portable runtime)", () => {
  if (!PG) {
    it.skip("requires disposable PostgreSQL", () => {});
    return;
  }

  let evidenceDir: string;
  const KEY = generateTestSigningKeyPair();

  beforeEach(() => {
    evidenceDir = mkdtempSync(join(tmpdir(), "abx-561-dur-"));
    process.env.ABRAXAS_PERSISTENCE_BACKEND = "postgres_direct";
    process.env.ABRAXAS_DATABASE_URL = PG;
    process.env.ABRAXAS_EVIDENCE_STORAGE_ROOT = evidenceDir;
    process.env.ABRAXAS_EVIDENCE_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("base64");
    process.env.ABRAXAS_SIGNING_KEY = JSON.stringify(KEY.privateKeyJwk);
    resetAbraxasPgPoolForTests();
    resetPersistenceClientForTests();
  });

  afterEach(() => {
    rmSync(evidenceDir, { recursive: true, force: true });
    resetAbraxasPgPoolForTests();
    resetPersistenceClientForTests();
  });

  it("preserves signing fingerprint and decryptable evidence after pool reset", async () => {
    const fpBefore = signingPublicFingerprintSha256(process.env);
    expect(fpBefore).toBeTruthy();

    const holder = `abx_hs_${randomBytes(16).toString("hex")}`;
    const session = `cap_${randomBytes(6).toString("hex")}`;
    const plaintext = Buffer.from("portable-runtime-durability-probe");

    const stored = storeEncryptedEvidence({
      holderSubjectId: holder,
      captureSessionId: session,
      artifactKind: "id_front",
      plaintext,
      env: process.env,
    });

    resetAbraxasPgPoolForTests();
    resetPersistenceClientForTests();

    const fpAfter = signingPublicFingerprintSha256(process.env);
    expect(fpAfter).toBe(fpBefore);

    const decrypted = readEncryptedEvidence({
      storagePath: stored.storagePath,
      env: process.env,
    });
    expect(decrypted.equals(plaintext)).toBe(true);
  });
});
