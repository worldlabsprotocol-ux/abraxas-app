import { describe, expect, it } from "vitest";
import { hashAction, hashEnvironment, hashNetworkId, hashPartnerId, hashPolicy, hashSignerKeyId } from "@/lib/partner/chainAttestation/hashes";
import { expectedSolanaConfigDigest } from "./digests";
import { solanaProgramElfKeccak } from "./solanaElfDigest";

describe("server-safe gate registration keccak parity", () => {
  it("matches the public devnet GateConfig binding packet", () => {
    const partnerHash = hashPartnerId("abraxas-institutional-devnet");
    const policyHash = hashPolicy("sandbox_institutional_protocol_access", 1);
    const actionHash = hashAction("activate_protocol_access", "sandbox:protocol_access");
    const environmentHash = hashEnvironment("sandbox");
    expect(hashNetworkId("solana_devnet")).toBe("0xd797fdae60e4b85eacabd735b9558a12bd06ccd644c4de9e0c83ee65b18ff92d");
    expect(partnerHash).toBe("0xf34d68b2c87306ce1c357592c850d0bfc21eecf81bbe6ddf6ab57f8427219309");
    expect(policyHash).toBe("0x54a56bf297411881409ec2fa5976aabf0e071ce8dcdd02aef3c252a08e437277");
    expect(actionHash).toBe("0x53a37ab3091d58031fae35e3b0671df0026cfb4006e9aee4234fadad0a384027");
    expect(environmentHash).toBe("0x01a2938b29f43a6bd3fadc4dd7f2f2ab0f94ca775ad78a1230d96aca47f1088f");
    expect(hashSignerKeyId("cask_f01509a0a19a1f9b1331899e")).toBe("0x5ed86050c272d04f5a2391ab53fa1474f1ce38c622189996db4fd9e417cc4230");
    expect(expectedSolanaConfigDigest({
      programId: "4hf3cY57ciPakr4omyTSbksAfW672iGrdo6fiDVQAD4K",
      partnerProgramId: "3B9eE1WtrtZQwJrkhFSKxxaZrefRJ73P53xHBBP3Bv1j",
      gateConfigPda: "53wiHMzFX9GttuVFQyQTvJGw9XvQmBbTcsGbwXQyk3D6",
      programDigest: "0x6adcb3850f269710bd815bde0cc518cf6d02e167a01398776d8d78df9f566991",
      partnerHash, policyHash, actionHash, environment: environmentHash,
      signerKeyId: "cask_f01509a0a19a1f9b1331899e", subjectBindingMode: "required",
    })).toBe("0xdccb2101a22ce8affbcde3b5923cea06ffe6225ceb72f368e83ff796cc1c6103");
  });

  it("hashes ELF bytes with Keccak-256 rather than SHA3-256", () => {
    expect(solanaProgramElfKeccak(new TextEncoder().encode("abc")))
      .toBe("0x4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45");
  });
});

