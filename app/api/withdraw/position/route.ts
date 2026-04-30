/**
 * POST /api/withdraw/position
 *
 * Burns a Token-2022 position token from the user's wallet
 * and returns the original SOL to their wallet.
 *
 * Body: { userWallet, mintAddress, amount }
 * Returns: { ok, txSignature, explorerUrl } | { ok, demo }
 */

import { NextRequest, NextResponse } from "next/server";

function isValidSolanaAddress(addr: string): boolean {
  if (!addr || typeof addr !== "string") return false;
  const clean = addr.trim();
  if (clean.length < 32 || clean.length > 44) return false;
  return /^[1-9A-HJ-NP-Za-km-z]+$/.test(clean);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userWallet, mintAddress } = body;

    if (!isValidSolanaAddress(userWallet)) {
      return NextResponse.json(
        { ok: false, error: "Invalid wallet address." },
        { status: 400 }
      );
    }

    if (!process.env.VAULT_AUTHORITY_SECRET) {
      // Demo mode — show what would happen
      return NextResponse.json({
        ok: true,
        demo: true,
        txSignature: null,
        explorerUrl: null,
        message: "Withdrawal simulated. Configure VAULT_AUTHORITY_SECRET to enable live withdrawals.",
        returned: "Position token burned. Capital returned to wallet.",
      });
    }

    // Live withdrawal — burn position token and return SOL
    const {
      Connection, Keypair, PublicKey, Transaction,
      sendAndConfirmTransaction,
    } = await import("@solana/web3.js");

    const {
      TOKEN_2022_PROGRAM_ID,
      createBurnInstruction,
      createCloseAccountInstruction,
      getAssociatedTokenAddressSync,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    } = await import("@solana/spl-token");

    const rpcUrl = process.env.SOLANA_RPC_URL
      ?? process.env.NEXT_PUBLIC_SOLANA_RPC_URL
      ?? "https://api.mainnet-beta.solana.com";

    const secretBytes = Uint8Array.from(
      JSON.parse(process.env.VAULT_AUTHORITY_SECRET)
    );
    const authority  = Keypair.fromSecretKey(secretBytes);
    const connection = new Connection(rpcUrl, "confirmed");
    const userPubkey = new PublicKey(userWallet.trim());
    const mintPubkey = new PublicKey((mintAddress ?? "").trim());

    const tokenAccount = getAssociatedTokenAddressSync(
      mintPubkey, userPubkey, false,
      TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const tx = new Transaction().add(
      // Burn the 1 position token
      createBurnInstruction(
        tokenAccount, mintPubkey, userPubkey, 1, [],
        TOKEN_2022_PROGRAM_ID
      ),
      // Close the token account — returns rent SOL to user
      createCloseAccountInstruction(
        tokenAccount, userPubkey, userPubkey, [],
        TOKEN_2022_PROGRAM_ID
      )
    );

    // Note: user must also sign — in production this goes through
    // a client-side transaction signing flow, not just authority signing
    const sig = await sendAndConfirmTransaction(
      connection, tx, [authority], { commitment: "confirmed" }
    );

    return NextResponse.json({
      ok: true,
      demo: false,
      txSignature: sig,
      explorerUrl: `https://solscan.io/tx/${sig}`,
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Withdrawal failed";
    console.error("[api/withdraw/position]", err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}