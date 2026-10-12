import { PublicKey } from "@solana/web3.js";

/** Squads Multisig v4 (canonical program id — devnet/mainnet). */
export const SQUADS_MULTISIG_V4_PROGRAM_ID =
  "SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf" as const;

/** Legacy v3 id still referenced in some clusters — do not use for v4 vault derivation. */
export const SQUADS_LEGACY_PROGRAM_ID = "SQDS4ep65F9uD9gU7t7AbzonPTcfd9d5Q5D8K4Xjpp1" as const;

export const SQUADS_SEED_PREFIX = "multisig" as const;
export const SQUADS_SEED_MULTISIG = "multisig" as const;
export const SQUADS_SEED_VAULT = "vault" as const;
export const SQUADS_SEED_TRANSACTION = "transaction" as const;
export const SQUADS_SEED_PROPOSAL = "proposal" as const;

export type SquadsMultisigPda = { multisigPda: PublicKey; bump: number; createKey: PublicKey };
export type SquadsVaultPda = {
  programId: PublicKey;
  multisigPda: PublicKey;
  vaultIndex: number;
  vaultPda: PublicKey;
  bump: number;
};
export type SquadsProposalPda = {
  multisigPda: PublicKey;
  transactionIndex: bigint;
  proposalPda: PublicKey;
  transactionPda: PublicKey;
  bump: number;
};

export function deriveSquadsMultisigPda(
  createKey: PublicKey,
  programId = new PublicKey(SQUADS_MULTISIG_V4_PROGRAM_ID),
): SquadsMultisigPda {
  const [multisigPda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from(SQUADS_SEED_PREFIX), Buffer.from(SQUADS_SEED_MULTISIG), createKey.toBuffer()],
    programId,
  );
  return { multisigPda, bump, createKey };
}

/** Squads v4 vault PDA: ["multisig", multisigPda, "vault", vaultIndex]. */
export function deriveSquadsV4VaultPda(
  multisigPda: PublicKey,
  vaultIndex: number,
  programId = new PublicKey(SQUADS_MULTISIG_V4_PROGRAM_ID),
): SquadsVaultPda {
  const [vaultPda, bump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from(SQUADS_SEED_PREFIX),
      multisigPda.toBuffer(),
      Buffer.from(SQUADS_SEED_VAULT),
      Buffer.from([vaultIndex & 0xff]),
    ],
    programId,
  );
  return { programId, multisigPda, vaultIndex, vaultPda, bump };
}

export function deriveSquadsVaultTransactionPda(
  multisigPda: PublicKey,
  transactionIndex: bigint,
  programId = new PublicKey(SQUADS_MULTISIG_V4_PROGRAM_ID),
): { transactionPda: PublicKey; bump: number } {
  const indexLe = Buffer.alloc(8);
  indexLe.writeBigUInt64LE(transactionIndex);
  const [transactionPda, bump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from(SQUADS_SEED_PREFIX),
      multisigPda.toBuffer(),
      Buffer.from(SQUADS_SEED_TRANSACTION),
      indexLe,
    ],
    programId,
  );
  return { transactionPda, bump };
}

export function deriveSquadsProposalPda(
  multisigPda: PublicKey,
  transactionIndex: bigint,
  programId = new PublicKey(SQUADS_MULTISIG_V4_PROGRAM_ID),
): SquadsProposalPda {
  const indexLe = Buffer.alloc(8);
  indexLe.writeBigUInt64LE(transactionIndex);
  const { transactionPda } = deriveSquadsVaultTransactionPda(multisigPda, transactionIndex, programId);
  const [proposalPda, bump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from(SQUADS_SEED_PREFIX),
      multisigPda.toBuffer(),
      Buffer.from(SQUADS_SEED_TRANSACTION),
      indexLe,
      Buffer.from(SQUADS_SEED_PROPOSAL),
    ],
    programId,
  );
  return { multisigPda, transactionIndex, proposalPda, transactionPda, bump };
}
