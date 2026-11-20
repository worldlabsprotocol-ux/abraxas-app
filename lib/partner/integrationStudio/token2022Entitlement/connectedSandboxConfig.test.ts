import { describe, expect, it, vi, afterEach } from "vitest";
import {
  connectedSandboxAttestationsReady,
  connectedSandboxGenesisHash,
  entitlementConsumerProgramSha256,
  proofContinuityProgramSha256,
} from "./connectedSandboxConfig";

describe("connected sandbox operator attestations", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("requires genesis and per-program bytecode digests", () => {
    expect(connectedSandboxAttestationsReady()).toBe(false);
    vi.stubEnv("ABRAXAS_CONNECTED_SANDBOX_GENESIS_HASH", "genesis-1");
    expect(connectedSandboxAttestationsReady()).toBe(false);
    vi.stubEnv("ABRAXAS_PROOF_CONTINUITY_PROGRAM_SHA256", "f".repeat(64));
    expect(connectedSandboxAttestationsReady()).toBe(false);
    vi.stubEnv("ABRAXAS_ENTITLEMENT_CONSUMER_PROGRAM_SHA256", "e".repeat(64));
    expect(connectedSandboxAttestationsReady()).toBe(true);
    expect(connectedSandboxGenesisHash()).toBe("genesis-1");
    expect(proofContinuityProgramSha256()).toBe("f".repeat(64));
    expect(entitlementConsumerProgramSha256()).toBe("e".repeat(64));
  });
});