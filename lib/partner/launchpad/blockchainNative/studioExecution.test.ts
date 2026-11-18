import { describe, expect, it, vi } from "vitest";
import { prepareBlockchainNativeStudioHarness } from "./studioExecution";

describe("blockchain-native studio execution", () => {
  it("fails closed when pinned RPC or registry admin is missing", () => {
    vi.stubEnv("ABRAXAS_PROOF_CONTINUITY_RPC_URL", "");
    vi.stubEnv("ABRAXAS_PROOF_CONTINUITY_REGISTRY_ADMIN", "");
    const result = prepareBlockchainNativeStudioHarness({
      partnerId: "partner-1",
      policyId: "policy-1",
      policyVersion: 1,
      policyTemplateId: "wallet_control",
      scenarioId: "approved",
    });
    expect(result).toEqual({ ok: false, code: "blockchain_native_studio_not_configured" });
    vi.unstubAllEnvs();
  });
});