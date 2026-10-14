import { describe, expect, it, vi } from "vitest";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { SOVEREIGN_STAGING_DATABASE_ID } from "./sovereignStagingConstants";
import { buildSovereignHealthReport } from "./sovereignHealth";

vi.mock("@/lib/databaseRecovery/pgClient", () => ({
  createRecoveryPgClient: vi.fn(async () => ({
    query: vi.fn(async () => ({ rows: [{ ok: 1 }] })),
    end: vi.fn(async () => undefined),
  })),
}));

vi.mock("@/lib/databaseRecovery/pgInventory", () => ({
  probeRecoveryInventoryReady: vi.fn(async () => true),
}));

vi.mock("@/lib/persistence/chainNeutralSchemaReady.server", () => ({
  chainNeutralIdentitySchemaReadyServer: vi.fn(async () => true),
}));

describe("buildSovereignHealthReport", () => {
  it("returns UNCONFIGURED when not postgres_direct staging", async () => {
    const report = await buildSovereignHealthReport({});
    expect(report.build).toBe(558);
    expect(report.tier).toBe("UNCONFIGURED");
  });

  it("returns STAGING_READY when staging env and probes succeed", async () => {
    const key = Buffer.alloc(32, 1).toString("base64");
    const report = await buildSovereignHealthReport({
      ABRAXAS_PERSISTENCE_BACKEND: "postgres_direct",
      ABRAXAS_SOVEREIGN_ENV_CLASS: "staging",
      ABRAXAS_SOVEREIGN_DATABASE_ID: SOVEREIGN_STAGING_DATABASE_ID,
      ABRAXAS_DATABASE_URL: "postgresql://abraxas:secret@127.0.0.1:5432/abraxas_sovereign_staging",
      ABRAXAS_EVIDENCE_STORAGE_ROOT: "/tmp",
      ABRAXAS_SIGNING_KEY: JSON.stringify(generateTestSigningKeyPair().privateKeyJwk),
      ABRAXAS_EVIDENCE_ENCRYPTION_KEY: key,
    });
    expect(report.tier).toBe("STAGING_READY");
    expect(report.checks.postgres).toBe("ok");
  });
});
