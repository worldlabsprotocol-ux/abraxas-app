import { describe, expect, it, vi, afterEach } from "vitest";
import {
  connectedSandboxAttestationsReady,
  connectedSandboxGenesisHash,
  connectedProgramIdsApproved,
  entitlementConsumerProgramSha256,
  proofContinuityProgramSha256,
  resolveConnectedProgramIds,
} from "./connectedSandboxConfig";
import { PROOF_CONTINUITY_PROGRAM_ID } from "@/lib/solana/proofContinuity/constants";
import { ENTITLEMENT_CONSUMER_PROGRAM_ID } from "@/lib/solana/token2022Entitlement/constants";

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

  it("preserves historical pins and rejects Devnet IDs until the reviewed pair is committed", () => {
    const historical = {
      clusterLabel: "pinned_sandbox",
      genesisHash: null,
      proofId: PROOF_CONTINUITY_PROGRAM_ID,
      consumerId: ENTITLEMENT_CONSUMER_PROGRAM_ID,
    };
    expect(connectedProgramIdsApproved(historical)).toBe(true);
    expect(connectedProgramIdsApproved({ ...historical, consumerId: PROOF_CONTINUITY_PROGRAM_ID })).toBe(false);
    expect(connectedProgramIdsApproved({
      clusterLabel: "solana_devnet",
      genesisHash: "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG",
      proofId: PROOF_CONTINUITY_PROGRAM_ID,
      consumerId: ENTITLEMENT_CONSUMER_PROGRAM_ID,
    })).toBe(false);
  });

  it("uses only a reviewed Devnet manifest as the default and honors explicit pins", () => {
    const pending = {
      status: "pending_public_ids", genesis_hash: "devnet",
      proof_continuity_program_id: null, entitlement_consumer_program_id: null,
    };
    const approved = {
      ...pending, status: "approved",
      proof_continuity_program_id: "ProofDevnet11111111111111111111111111111111",
      entitlement_consumer_program_id: "ConsumerDevnet1111111111111111111111111111",
    };
    expect(resolveConnectedProgramIds({ clusterLabel: "solana_devnet", manifest: pending })).toEqual({
      proofId: PROOF_CONTINUITY_PROGRAM_ID,
      consumerId: ENTITLEMENT_CONSUMER_PROGRAM_ID,
    });
    expect(resolveConnectedProgramIds({ clusterLabel: "solana_devnet", manifest: approved })).toEqual({
      proofId: approved.proof_continuity_program_id,
      consumerId: approved.entitlement_consumer_program_id,
    });
    expect(resolveConnectedProgramIds({ clusterLabel: "pinned_sandbox", manifest: approved })).toEqual({
      proofId: PROOF_CONTINUITY_PROGRAM_ID,
      consumerId: ENTITLEMENT_CONSUMER_PROGRAM_ID,
    });
    expect(resolveConnectedProgramIds({
      clusterLabel: "solana_devnet", manifest: approved,
      configuredProofId: "unexpected", configuredConsumerId: "unexpected",
    })).toEqual({ proofId: "unexpected", consumerId: "unexpected" });
  });
});

