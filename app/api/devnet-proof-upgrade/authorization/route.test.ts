import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const reference = "https://github.com/worldlabsprotocol-ux/abraxas-app/pull/1003#issuecomment-1234567890";
const commit = "73063d01c952e54e28cdb6c93ddf0d0b8b356b87";
afterEach(() => vi.unstubAllEnvs());

describe("Proof Continuity upgrade gate", () => {
  it("stays disabled in Production even with copied approval variables", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("ABRAXAS_DEVNET_PROOF_UPGRADE_ENABLED", "true");
    vi.stubEnv("ABRAXAS_DEVNET_PROOF_UPGRADE_MAX_LAMPORTS", "2500000000");
    vi.stubEnv("ABRAXAS_DEVNET_PROOF_UPGRADE_APPROVAL_REFERENCE", reference);
    vi.stubEnv("VERCEL_GIT_COMMIT_REF", "codex/devnet-step5-phantom-signing");
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", commit);
    vi.stubEnv("ABRAXAS_DEVNET_PROOF_UPGRADE_APPROVED_COMMIT_SHA", commit);
    vi.stubEnv("ABRAXAS_DEVNET_PROOF_UPGRADE_BATCH_PROBE_ENABLED", "true");
    vi.stubEnv("ABRAXAS_DEVNET_PROOF_UPGRADE_BATCH_PROBE_APPROVAL_REFERENCE", reference);
    expect((await GET().json()).enabled).toBe(false);
    expect((await GET().json()).probeEnabled).toBe(false);
  });

  it("requires a fresh approval reference and exact cap in Preview", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_GIT_COMMIT_REF", "codex/devnet-step5-phantom-signing");
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", commit);
    vi.stubEnv("ABRAXAS_DEVNET_PROOF_UPGRADE_APPROVED_COMMIT_SHA", commit);
    vi.stubEnv("ABRAXAS_DEVNET_PROOF_UPGRADE_ENABLED", "true");
    vi.stubEnv("ABRAXAS_DEVNET_PROOF_UPGRADE_MAX_LAMPORTS", "2500000000");
    vi.stubEnv("ABRAXAS_DEVNET_PROOF_UPGRADE_APPROVAL_REFERENCE",
      "https://github.com/worldlabsprotocol-ux/abraxas-app/pull/1001#issuecomment-7203755892");
    expect((await GET().json()).enabled).toBe(false);
    vi.stubEnv("ABRAXAS_DEVNET_PROOF_UPGRADE_APPROVAL_REFERENCE", reference);
    expect((await GET().json()).enabled).toBe(true);
    vi.stubEnv("ABRAXAS_DEVNET_PROOF_UPGRADE_MAX_LAMPORTS", "2500000001");
    expect((await GET().json()).enabled).toBe(false);
    vi.stubEnv("ABRAXAS_DEVNET_PROOF_UPGRADE_MAX_LAMPORTS", "2500000000");
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "a".repeat(40));
    expect((await GET().json()).enabled).toBe(false);
  });

  it("keeps the signing-only probe separate from transaction execution", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_GIT_COMMIT_REF", "codex/devnet-step5-phantom-signing");
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", commit);
    vi.stubEnv("ABRAXAS_DEVNET_PROOF_UPGRADE_APPROVED_COMMIT_SHA", commit);
    vi.stubEnv("ABRAXAS_DEVNET_PROOF_UPGRADE_BATCH_PROBE_ENABLED", "true");
    vi.stubEnv("ABRAXAS_DEVNET_PROOF_UPGRADE_BATCH_PROBE_APPROVAL_REFERENCE", reference);
    const result = await GET().json();
    expect(result.probeEnabled).toBe(true);
    expect(result.enabled).toBe(false);
    expect(result.maxLamports).toBe(0);
    vi.stubEnv("ABRAXAS_DEVNET_PROOF_UPGRADE_BATCH_PROBE_APPROVAL_REFERENCE", "invalid");
    expect((await GET().json()).probeEnabled).toBe(false);
    vi.stubEnv("ABRAXAS_DEVNET_PROOF_UPGRADE_BATCH_PROBE_APPROVAL_REFERENCE", reference);
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "a".repeat(40));
    expect((await GET().json()).probeEnabled).toBe(false);
  });
});
