import { PublicKey } from "@solana/web3.js";
import {
  deriveSquadsV4VaultPda,
  SQUADS_LEGACY_PROGRAM_ID,
  SQUADS_MULTISIG_V4_PROGRAM_ID,
} from "@/lib/solana/trustRegistry/governance/squadsV4Pda";

/** @deprecated Use SQUADS_MULTISIG_V4_PROGRAM_ID — kept for cluster diff notes. */
export const SQUADS_PROGRAM_ID_DEVNET = SQUADS_LEGACY_PROGRAM_ID;

export type SquadsVaultDerivation = {
  programId: PublicKey;
  multisig: PublicKey;
  vaultIndex: number;
  vaultPda: PublicKey;
  bump: number;
};

/**
 * Squads v4 vault PDA. `multisig` must be the Squads **multisig account** PDA (not create_key).
 * Build #537 corrects v536 seed layout to match @sqds/multisig v4.
 */
export function deriveSquadsVaultPda(
  multisigPda: PublicKey,
  vaultIndex: number,
  programId = new PublicKey(SQUADS_MULTISIG_V4_PROGRAM_ID),
): SquadsVaultDerivation {
  const v4 = deriveSquadsV4VaultPda(multisigPda, vaultIndex, programId);
  return {
    programId: v4.programId,
    multisig: v4.multisigPda,
    vaultIndex: v4.vaultIndex,
    vaultPda: v4.vaultPda,
    bump: v4.bump,
  };
}

export type SquadsAcceptCompatibilityVerdict = {
  compatible: "conditional";
  notes: string[];
};

/** Static compatibility review — devnet Squads execute still requires member onboarding. */
export function squadsVaultAcceptCompatibilityReview(): SquadsAcceptCompatibilityVerdict {
  return {
    compatible: "conditional",
    notes: [
      "Use Squads v4 program id SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf and vault seeds [multisig, multisigPda, vault, index].",
      "Nomination may target a Squads vault PDA (pubkey-only).",
      "Accept requires pending_authority Signer; bare wallet txs cannot sign for a PDA.",
      "Squads vaultTransactionCreate → proposalApprove (threshold) → vaultTransactionExecute must CPI accept with vault marked signer.",
      "Loader upgrade authority transfer uses BPF Upgradeable Loader; separate Squads proposal from in-program accept.",
      "Local #537 rehearsal uses governance-vault-rehearsal program (isomorphic seeds) — not a substitute for devnet Squads evidence.",
    ],
  };
}
