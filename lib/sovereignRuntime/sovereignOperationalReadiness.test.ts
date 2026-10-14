import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { SOVEREIGN_DISPOSABLE_REF } from "@/lib/databaseRecovery/manifestGuard";
import { observeSovereignOperationalReadiness } from "./sovereignOperationalReadiness";

describe("sovereign operational readiness", () => {
  it("marks operational when postgres, evidence R/W, and signing probes succeed", async () => {
    const pg = process.env.ABRAXAS_DATABASE_URL?.trim() || process.env.ABRAXAS_SOVEREIGN_PG_URL?.trim();
    if (!pg) {
      expect(true).toBe(true);
      return;
    }
    const evidence = mkdtempSync(join(tmpdir(), "abx-561-op-"));
    try {
      const report = await observeSovereignOperationalReadiness({
        ABRAXAS_PERSISTENCE_BACKEND: "postgres_direct",
        ABRAXAS_SOVEREIGN_ENV_CLASS: "disposable",
        ABRAXAS_SOVEREIGN_DATABASE_ID: SOVEREIGN_DISPOSABLE_REF,
        ABRAXAS_DATABASE_URL: pg,
        ABRAXAS_EVIDENCE_STORAGE_ROOT: evidence,
        ABRAXAS_EVIDENCE_ENCRYPTION_KEY: Buffer.alloc(32, 2).toString("base64"),
        ABRAXAS_SIGNING_KEY: JSON.stringify(generateTestSigningKeyPair().privateKeyJwk),
        IDV_PROVIDER: "manual",
      });
      expect(report.postgres_ready).toBe(true);
      expect(report.evidence_read_write).toBe(true);
      expect(report.signing_configured).toBe(true);
      expect(report.signing_public_fingerprint_sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(report.operational).toBe(true);
    } finally {
      rmSync(evidence, { recursive: true, force: true });
    }
  });
});
