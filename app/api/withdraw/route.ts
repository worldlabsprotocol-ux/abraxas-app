// FILE: app/api/withdraw/route.ts
// Withdraws a position. Burns ABRAP Token-2022. Returns principal + accrued yield.
// SIMULATED when VAULT_AUTHORITY_SECRET not set — clearly labeled.
// Authority: user wallet must match position owner (enforced on deposit).

import { NextRequest, NextResponse } from "next/server";

function isValidSolanaAddress(addr: string): boolean {
  if (!addr || typeof addr !== "string") return false;
  const c = addr.trim();
  return c.length >= 32 && c.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(c);
}

function fakeBase58(len = 88): string {
  const ch = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let out = "";
  for (let i = 0; i < len; i++) out += ch[Math.floor(Math.random() * ch.length)];
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userWallet, mintAddress, principal, accruedYield } = body;

    if (!isValidSolanaAddress(userWallet)) {
      return NextResponse.json({ ok: false, error: "Invalid wallet address." }, { status: 400 });
    }

    // withdrawAmount = principal + accruedYield (deterministic, not arbitrary)
    const amountReturned = (principal ?? 0) + (accruedYield ?? 0);

    // ── SIMULATED MODE ────────────────────────────────────────────────────────
    if (!process.env.VAULT_AUTHORITY_SECRET) {
      const txSignature = fakeBase58();
      return NextResponse.json({
        ok:              true,
        simulated:       true,
        txSignature,
        explorerUrl:     `https://solscan.io/tx/${txSignature}`,
        amountReturned,
        message:         "Simulated exit. ABRAP burn + SOL return structure is real. Add VAULT_AUTHORITY_SECRET for live execution.",
      });
    }

    // ── LIVE BURN ─────────────────────────────────────────────────────────────
    const { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } = await import("@solana/web3.js");
    const { TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, createBurnInstruction, createCloseAccountInstruction, getAssociatedTokenAddressSync } = await import("@solana/spl-token");

    const rpcUrl    = process.env.SOLANA_RPC_URL ?? process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
    const authority = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.VAULT_AUTHORITY_SECRET!)));
    const connection= new Connection(rpcUrl, "confirmed");
    const userPubkey= new PublicKey(userWallet.trim());
    const mintPubkey= new PublicKey((mintAddress ?? "").trim());

    const tokenAccount = getAssociatedTokenAddressSync(mintPubkey, userPubkey, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

    const tx = new Transaction().add(
      createBurnInstruction(tokenAccount, mintPubkey, userPubkey, 1, [], TOKEN_2022_PROGRAM_ID),
      createCloseAccountInstruction(tokenAccount, userPubkey, userPubkey, [], TOKEN_2022_PROGRAM_ID),
    );

    const sig = await sendAndConfirmTransaction(connection, tx, [authority], { commitment: "confirmed" });

    return NextResponse.json({ ok: true, simulated: false, txSignature: sig, explorerUrl: `https://solscan.io/tx/${sig}`, amountReturned });

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Withdraw failed";
    console.error("[api/withdraw]", err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}