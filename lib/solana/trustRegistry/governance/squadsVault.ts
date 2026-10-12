import { PublicKey } from "@solana/web3.js";

/** Squads v3/v4 program (devnet/mainnet — verify cluster before use). */
export const SQUADS_PROGRAM_ID_DEVNET = "SQDS4ep65F9uD9gU7t7AbzonPTcfd9d5Q5D8K4Xjpp1" as const;

export type SquadsVaultDerivation = {
  programId: PublicKey;
  multisig: PublicKey;
  vaultIndex: number;
  vaultPda: PublicKey;
  bump: number;
};

/**
 * Squads vault PDA (typical pattern). Confirm against your Squads version docs before rehearsal.
 * Execution model: `accept_governance_authority` requires the vault to appear as a transaction signer.
 * Squads proposals must use the vault transaction / CPI path so the runtime sets `is_signer` on the vault PDA.
 */
export function deriveSquadsVaultPda(
  multisig: PublicKey,
  vaultIndex: number,
  programId = new PublicKey(SQUADS_PROGRAM_ID_DEVNET),
): SquadsVaultDerivation {
  const indexSeed = Buffer.alloc(1);
  indexSeed.writeUInt8(vaultIndex);
  const [vaultPda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), multisig.toBuffer(), indexSeed],
    programId,
  );
  return { programId, multisig, vaultIndex, vaultPda, bump };
}

export type SquadsAcceptCompatibilityVerdict = {
  compatible: "conditional";
  notes: string[];
};

/** Static compatibility review — not a substitute for devnet rehearsal. */
export function squadsVaultAcceptCompatibilityReview(): SquadsAcceptCompatibilityVerdict {
  return {
    compatible: "conditional",
    notes: [
      "Nomination may target a Squads vault PDA (pubkey-only).",
      "Accept requires pending_authority Signer; bare wallet txs cannot sign for a PDA.",
      "Squads must execute accept via vault authority (proposal → execute) with vault marked signer.",
      "Loader upgrade authority transfer uses System Program + BPF Loader; separate Squads proposal from in-program accept.",
      "Devnet rehearsal must capture tx signature, slot, vault pubkey, and post-state governance_authority.",
    ],
  };
}
