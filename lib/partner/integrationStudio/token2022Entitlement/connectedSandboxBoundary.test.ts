import { describe, expect, it, vi, afterEach } from "vitest";
import { evaluateConnectedSandboxBoundary } from "./connectedSandboxBoundary";

describe("connected sandbox boundary", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fails closed on production", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const result = await evaluateConnectedSandboxBoundary();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("production_entitlement_unavailable");
  });

  it("rejects when relying party admin is missing", async () => {
    vi.stubEnv("VERCEL_ENV", "development");
    vi.stubEnv("ABRAXAS_PROOF_CONTINUITY_RPC_URL", "http://127.0.0.1:8899");
    vi.stubEnv("ABRAXAS_PROOF_CONTINUITY_REGISTRY_ADMIN", "11111111111111111111111111111112");
    vi.stubEnv("BLOCKCHAIN_NATIVE_PREPARE_HMAC_KEY", "01234567890123456789012345678901");
    const result = await evaluateConnectedSandboxBoundary();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("connected_sandbox_not_configured");
  });
});