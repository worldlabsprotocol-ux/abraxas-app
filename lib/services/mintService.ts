// FILE: lib/services/mintService.ts
// On-chain ABRA deduction service.
// Creates a real SPL token transfer instruction from user wallet → treasury.
// Signs and sends via Wallet Adapter. Returns confirmed tx signature.
"use client";

import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  getAccount,
  TOKEN_PROGRAM_ID,
  TokenAccountNotFoundError,
} from "@solana/spl-token";
import {
  Transaction,
  PublicKey,
  Connection,
  SendTransactionError,
} from "@solana/web3.js";

// Protocol constants
export const ABRA_MINT_CA   = "5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS";
export const TREASURY_WALLET = "63LGWS2JSK5CawZt6iPchVU6wj63v3DtsTR1jaRnjMaY";
export const ABRA_DECIMALS   = 6;   // adjust if token uses different decimals

export interface MintResult {
  success:      boolean;
  txSignature:  string | null;
  error:        string | null;
  amountDebited: number;
}

/**
 * Deduct ABRA from user wallet to treasury.
 * Uses Solana Wallet Adapter signAndSendTransaction.
 */
export async function deductAbraForMint(params: {
  connection:          Connection;
  userWallet:          PublicKey;
  amountAbra:          number;
  signAndSendTransaction: (tx: Transaction) => Promise<string>;
}): Promise<MintResult> {
  const { connection, userWallet, amountAbra, signAndSendTransaction } = params;
  const mintPk     = new PublicKey(ABRA_MINT_CA);
  const treasuryPk = new PublicKey(TREASURY_WALLET);

  try {
    // 1. Get user ATA
    const fromATA = await getAssociatedTokenAddress(mintPk, userWallet);
    const toATA   = await getAssociatedTokenAddress(mintPk, treasuryPk);

    // 2. Verify user has sufficient ABRA
    let fromAccount;
    try {
      fromAccount = await getAccount(connection, fromATA);
    } catch (e) {
      if (e instanceof TokenAccountNotFoundError) {
        return { success:false, txSignature:null, amountDebited:0,
                 error:"No ABRA token account found. Acquire ABRA first." };
      }
      throw e;
    }

    const rawAmount = BigInt(Math.round(amountAbra * Math.pow(10, ABRA_DECIMALS)));
    if (fromAccount.amount < rawAmount) {
      const actual = Number(fromAccount.amount) / Math.pow(10, ABRA_DECIMALS);
      return { success:false, txSignature:null, amountDebited:0,
               error:`Insufficient ABRA. You have ${actual.toLocaleString()} — ${amountAbra.toLocaleString()} required.` };
    }

    // 3. Build transfer instruction: user ATA → treasury ATA
    const ix = createTransferInstruction(
      fromATA,        // source
      toATA,          // destination (treasury)
      userWallet,     // authority
      rawAmount,
      [],
      TOKEN_PROGRAM_ID
    );

    const tx = new Transaction().add(ix);
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed");
    tx.recentBlockhash = blockhash;
    tx.feePayer = userWallet;

    // 4. Sign and send via wallet adapter
    const txSig = await signAndSendTransaction(tx);

    // 5. Wait for confirmation
    await connection.confirmTransaction(
      { signature:txSig, blockhash, lastValidBlockHeight },
      "confirmed"
    );

    return { success:true, txSignature:txSig, amountDebited:amountAbra, error:null };

  } catch (e: unknown) {
    const msg = e instanceof SendTransactionError
      ? "Transaction rejected by wallet or network."
      : (e as Error).message ?? "Unknown error during ABRA transfer.";
    return { success:false, txSignature:null, amountDebited:0, error:msg };
  }
}

/**
 * Demo mode: simulate deduction without on-chain tx.
 * Used when wallet is not connected or on devnet/local.
 */
export function simulateMintDeduction(amountAbra: number): MintResult {
  return {
    success:      true,
    txSignature:  `DEMO-${Date.now().toString(36).toUpperCase()}`,
    amountDebited:amountAbra,
    error:        null,
  };
}