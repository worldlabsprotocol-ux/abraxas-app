import { describe, expect, it } from "vitest";
import { Keypair, PublicKey } from "@solana/web3.js";
import {
  deriveSquadsVaultPda,
  squadsVaultAcceptCompatibilityReview,
  SQUADS_PROGRAM_ID_DEVNET,
} from "@/lib/solana/trustRegistry/governance/squadsVault";

describe("Squads vault derivation (Build #536)", () => {
  it("derives stable vault PDAs for a multisig", () => {
    const multisig = Keypair.generate().publicKey;
    const a = deriveSquadsVaultPda(multisig, 0);
    const b = deriveSquadsVaultPda(multisig, 0);
    expect(a.vaultPda.equals(b.vaultPda)).toBe(true);
    expect(a.programId.equals(new PublicKey(SQUADS_PROGRAM_ID_DEVNET))).toBe(true);
  });

  it("documents conditional accept compatibility (rehearsal required)", () => {
    const review = squadsVaultAcceptCompatibilityReview();
    expect(review.compatible).toBe("conditional");
    expect(review.notes.some((n) => n.includes("Signer"))).toBe(true);
  });
});
