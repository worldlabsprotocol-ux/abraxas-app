import { PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import {
  buildConsumeVerifiedEntitlementInstruction,
  buildMintVerifiedEntitlementInstruction,
} from "./buildEntitlementInstructions";
import { ENTITLEMENT_CONSUMER_PROGRAM_ID } from "./constants";
import { PROOF_CONTINUITY_PROGRAM_ID } from "@/lib/solana/proofContinuity/constants";

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
});