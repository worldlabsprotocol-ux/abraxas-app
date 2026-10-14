import { describe, expect, it } from "vitest";
import { validateInstitutionalSovereignEnv } from "./institutionalActivationEnv";

const KEY_32 = Buffer.alloc(32, 9).toString("base64");
const SIGNING = JSON.stringify({ kty: "OKP", crv: "Ed25519", d: "x", x: "y" });

describe("validateInstitutionalSovereignEnv", () => {
  it("passes minimal sovereign institutional env", () => {
    const report = validateInstitutionalSovereignEnv({
      ABRAXAS_PERSISTENCE_BACKEND: "postgres_direct",
      ABRAXAS_DATABASE_URL: "postgresql://app:secret@db.example:5432/abraxas",
      ABRAXAS_EVIDENCE_STORAGE_ROOT: "/var/abraxas/evidence",
      ABRAXAS_EVIDENCE_ENCRYPTION_KEY: KEY_32,
      ABRAXAS_SIGNING_KEY: SIGNING,
      ABRAXAS_BACKUP_ENCRYPTION_KEY: KEY_32,
    });
    expect(report.ok).toBe(true);
    expect(report.errors).toHaveLength(0);
  });

  it("fails when postgres_direct keys are missing", () => {
    const report = validateInstitutionalSovereignEnv({});
    expect(report.ok).toBe(false);
    expect(report.errors.some((e) => e.code === "missing_abraxas_database_url")).toBe(true);
  });
});
