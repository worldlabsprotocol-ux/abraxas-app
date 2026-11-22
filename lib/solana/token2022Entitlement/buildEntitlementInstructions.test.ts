import { PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import {
  buildConsumeVerifiedEntitlementInstruction,
  buildMintVerifiedEntitlementInstruction,
} from "./buildEntitlementInstructions";
import { ENTITLEMENT_CONSUMER_PROGRAM_ID } from "./constants";
import { PROOF_CONTINUITY_PROGRAM_ID } from "@/lib/solana/proofContinuity/constants";
import { findProofRegistryPda } from "@/lib/solana/proofContinuity/pda";
import { buildRegisterSandboxBindingInstruction } from "@/lib/solana/proofContinuity/buildProofContinuityInstructions";
import { findEntitlementConsumptionPda } from "./pda";

describe("token2022 entitlement instructions", () => {
  const admin = PublicKey.unique();
  const holder = PublicKey.unique();
  const relying = PublicKey.unique();
  const receipt = Buffer.alloc(32, 7);

  it("targets pinned program ids", () => {
    const mint = buildMintVerifiedEntitlementInstruction({
      registryAdmin: admin,
      holder,
      payer: holder,
      receiptIdHash: receipt,
    });
    expect(mint.programId.toBase58()).toBe(PROOF_CONTINUITY_PROGRAM_ID);
    const consume = buildConsumeVerifiedEntitlementInstruction({
      registryAdmin: admin,
      relyingPartyAdmin: relying,
      holder,
      payer: holder,
      receiptIdHash: receipt,
    });
    expect(consume.programId.toBase58()).toBe(ENTITLEMENT_CONSUMER_PROGRAM_ID);
  });

  it("requires holder signature on mint and consume", () => {
    const mint = buildMintVerifiedEntitlementInstruction({
      registryAdmin: admin,
      holder,
      payer: holder,
      receiptIdHash: receipt,
    });
    expect(mint.keys.find((k) => k.pubkey.equals(holder))?.isSigner).toBe(true);
    const consume = buildConsumeVerifiedEntitlementInstruction({
      registryAdmin: admin,
      relyingPartyAdmin: relying,
      holder,
      payer: holder,
      receiptIdHash: receipt,
    });
    expect(consume.keys.find((k) => k.pubkey.equals(holder))?.isSigner).toBe(true);
  });

  it("keeps alternate Devnet identities consistent across instructions, CPI, and PDAs", () => {
    const programIds = {
      proofContinuity: PublicKey.unique(),
      entitlementConsumer: PublicKey.unique(),
    };
    const mint = buildMintVerifiedEntitlementInstruction({
      registryAdmin: admin, holder, payer: holder, receiptIdHash: receipt, programIds,
    });
    const consume = buildConsumeVerifiedEntitlementInstruction({
      registryAdmin: admin, relyingPartyAdmin: relying, holder, payer: holder, receiptIdHash: receipt, programIds,
    });
    const registry = findProofRegistryPda(admin, programIds.proofContinuity).address;
    const binding = buildRegisterSandboxBindingInstruction({
      registryAdmin: admin, holder, programId: programIds.proofContinuity,
    });
    const consumption = findEntitlementConsumptionPda(registry, receipt, programIds.entitlementConsumer).address;
    expect(mint.programId.equals(programIds.proofContinuity)).toBe(true);
    expect(binding.programId.equals(programIds.proofContinuity)).toBe(true);
    expect(binding.keys.some((key) => key.pubkey.equals(registry))).toBe(true);
    expect(consume.programId.equals(programIds.entitlementConsumer)).toBe(true);
    expect(mint.keys.some((key) => key.pubkey.equals(registry))).toBe(true);
    expect(consume.keys.some((key) => key.pubkey.equals(registry))).toBe(true);
    expect(consume.keys.some((key) => key.pubkey.equals(programIds.proofContinuity))).toBe(true);
    expect(consume.keys.some((key) => key.pubkey.equals(consumption))).toBe(true);
    expect(registry.equals(findProofRegistryPda(admin).address)).toBe(false);
  });
});
