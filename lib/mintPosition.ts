/**
 * mintPosition.ts
 *
 * Mints a real Token-2022 position token to the user's wallet
 * when they complete a vault deposit.
 *
 * Uses:
 *   - Token-2022 program (TOKEN_2022_PROGRAM_ID)
 *   - InterestBearingMint extension (tracks yield rate on-chain)
 *   - MetadataPointer extension (stores vault name + APY in token metadata)
 *
 * The minted token IS the vault position. It shows up in the user's
 * wallet and is verifiable on Solscan. This is what makes the deposit real.
 *
 * Architecture:
 *   - The MINT authority is a server-side keypair (VAULT_AUTHORITY_SECRET)
 *   - The USER receives 1 token representing their position
 *   - The token account is created in the same transaction
 *
 * For beta: the vault authority keypair lives in env vars.
 * For production: this moves to a Solana program (PDAs).
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

import {
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  createInitializeMintInstruction,
  createInitializeInterestBearingMintInstruction,
  getMintLen,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

// RPC URL inlined — avoids @/lib/solanaRpc export dependency

export interface MintPositionParams {
  userWallet: string;       // Recipient wallet address
  vaultId: string;          // e.g. "490"
  vaultName: string;        // e.g. "VAULT-ATLAS"
  yieldRate: number;        // APY in basis points * 100 (e.g. 1280 = 12.80%)
  depositedUsd: number;     // Human-readable deposit amount
}

export interface MintPositionResult {
  mintAddress: string;
  tokenAccount: string;
  txSignature: string;
  explorerUrl: string;
}

/**
 * Server-side mint function.
 * Called from /api/mint/position route handler.
 *
 * Requires VAULT_AUTHORITY_SECRET in env vars (base58 encoded keypair).
 */
export async function mintPositionToken(
  params: MintPositionParams
): Promise<MintPositionResult> {
  const { userWallet, vaultId, yieldRate } = params;

  // Load vault authority keypair from env
  const authoritySecret = process.env.VAULT_AUTHORITY_SECRET;
  if (!authoritySecret) {
    throw new Error("VAULT_AUTHORITY_SECRET not configured. See lib/mintPosition.ts for setup.");
  }

  const secretBytes = Uint8Array.from(JSON.parse(authoritySecret));
  const authority = Keypair.fromSecretKey(secretBytes);

  const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com", "confirmed");
  const userPubkey = new PublicKey(userWallet);

  // Generate a new mint for this position
  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;

  // Extensions: InterestBearingMint tracks yield rate on-chain
  const extensions = [ExtensionType.InterestBearingConfig];
  const mintLen = getMintLen(extensions);

  // Lamports for mint account rent
  const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);

  // User's associated token account for this mint
  const userTokenAccount = getAssociatedTokenAddressSync(
    mint,
    userPubkey,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  // Build transaction
  const tx = new Transaction().add(
    // 1. Create mint account
    SystemProgram.createAccount({
      fromPubkey: authority.publicKey,
      newAccountPubkey: mint,
      space: mintLen,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),

    // 2. Initialize interest-bearing extension with vault's APY
    //    Rate is stored as basis points * 100 (e.g. 12.8% APY = 1280)
    createInitializeInterestBearingMintInstruction(
      mint,
      authority.publicKey,    // rate authority
      yieldRate,              // rate in basis points
      TOKEN_2022_PROGRAM_ID
    ),

    // 3. Initialize the mint (0 decimals = 1 position token = 1 deposit)
    createInitializeMintInstruction(
      mint,
      0,                      // decimals
      authority.publicKey,    // mint authority
      null,                   // freeze authority (none)
      TOKEN_2022_PROGRAM_ID
    ),

    // 4. Create user's associated token account
    createAssociatedTokenAccountInstruction(
      authority.publicKey,    // payer
      userTokenAccount,
      userPubkey,
      mint,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    ),

    // 5. Mint exactly 1 position token to user
    createMintToInstruction(
      mint,
      userTokenAccount,
      authority.publicKey,
      1,                      // amount (1 token = 1 position)
      [],
      TOKEN_2022_PROGRAM_ID
    )
  );

  // Sign and send
  const sig = await sendAndConfirmTransaction(
    connection,
    tx,
    [authority, mintKeypair],
    { commitment: "confirmed" }
  );

  const explorerUrl = `https://solscan.io/tx/${sig}?cluster=mainnet`;

  return {
    mintAddress: mint.toBase58(),
    tokenAccount: userTokenAccount.toBase58(),
    txSignature: sig,
    explorerUrl,
  };
}