import { describe, expect, it } from "vitest";
import { evaluateConnectedSandboxBoundary } from "./connectedSandboxBoundary";
import { connectedSandboxAttestationsReady } from "./connectedSandboxConfig";

describe("BUILD #985 acceptance labels (preflight)", () => {
  it("fails closed without operator sandbox configuration", async () => {
    const prior = { ...process.env };
    for (const key of [
      "ABRAXAS_PROOF_CONTINUITY_RPC_URL",
      "ABRAXAS_PROOF_CONTINUITY_REGISTRY_ADMIN",
      "ABRAXAS_ENTITLEMENT_RELYING_PARTY_ADMIN",
      "BLOCKCHAIN_NATIVE_PREPARE_HMAC_KEY",
      "ABRAXAS_CONNECTED_SANDBOX_GENESIS_HASH",
      "ABRAXAS_PROOF_CONTINUITY_PROGRAM_SHA256",
      "ABRAXAS_ENTITLEMENT_CONSUMER_PROGRAM_SHA256",
    ]) {
      delete process.env[key];
    }
    expect(connectedSandboxAttestationsReady()).toBe(false);
    const boundary = await evaluateConnectedSandboxBoundary();
    expect(boundary.ok).toBe(false);
    if (!boundary.ok) {
      expect(boundary.code).toBe("connected_sandbox_not_configured");
    }
    process.env = prior;
  });

  it("never marks connected sandbox verified without actionable mint_and_consume", async () => {
    const boundary = await evaluateConnectedSandboxBoundary();
    if (boundary.ok && boundary.mint_and_consume_actionable) {
      expect(connectedSandboxAttestationsReady()).toBe(true);
    } else {
      expect(boundary.ok === false || boundary.mint_and_consume_actionable === false).toBe(true);
    }
  });
});