import { describe, expect, it } from "vitest";
import { Keypair, PublicKey } from "@solana/web3.js";
import { deriveSquadsMultisigPda } from "@/lib/solana/trustRegistry/governance/squadsV4Pda";
import {
  deriveSquadsVaultPda,
  squadsVaultAcceptCompatibilityReview,
} from "@/lib/solana/trustRegistry/governance/squadsVault";
import { SQUADS_MULTISIG_V4_PROGRAM_ID } from "@/lib/solana/trustRegistry/governance/squadsV4Pda";

describe("Squads vault derivation (Build #536/#537)", () => {
  it("derives stable vault PDAs for a multisig", () => {
    const { multisigPda: multisig } = deriveSquadsMultisigPda(Keypair.generate().publicKey);
    const a = deriveSquadsVaultPda(multisig, 0);
    const b = deriveSquadsVaultPda(multisig, 0);
    expect(a.vaultPda.equals(b.vaultPda)).toBe(true);
    expect(a.programId.equals(new PublicKey(SQUADS_MULTISIG_V4_PROGRAM_ID))).toBe(true);
  });

  it("documents conditional accept compatibility (rehearsal required)", () => {
    const review = squadsVaultAcceptCompatibilityReview();
    expect(review.compatible).toBe("conditional");
    expect(review.notes.some((n) => n.includes("Signer"))).toBe(true);
  });
});
