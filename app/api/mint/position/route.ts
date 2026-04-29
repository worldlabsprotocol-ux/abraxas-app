/**
 * POST /api/mint/position
 * Mints a real Token-2022 position token to the user's wallet.
 *
 * Setup — add to .env.local:
 *   VAULT_AUTHORITY_SECRET=[JSON array of secret key bytes]
 *
 * Generate your keypair (run once in terminal):
 *   node -e "const {Keypair}=require('@solana/web3.js');const k=Keypair.generate();console.log(JSON.stringify(Array.from(k.secretKey)));console.log('pubkey:',k.publicKey.toBase58())"
 *
 * Then fund that pubkey with 0.05 SOL on mainnet for fees.
 */

import { NextRequest, NextResponse } from "next/server";
import { mintPositionToken } from "@/lib/mintPosition";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userWallet, vaultId, vaultName, yieldRate, depositedUsd } = body;

    if (!userWallet || !vaultId) {
      return NextResponse.json(
        { ok: false, error: "userWallet and vaultId required" },
        { status: 400 }
      );
    }

    // If authority not configured, return a demo response
    if (!process.env.VAULT_AUTHORITY_SECRET) {
      return NextResponse.json({
        ok: true,
        demo: true,
        mintAddress: "DEMO_" + Math.random().toString(36).slice(2, 10).toUpperCase(),
        tokenAccount: userWallet,
        txSignature: null,
        explorerUrl: null,
        message: "Configure VAULT_AUTHORITY_SECRET to mint real Token-2022 positions."
      });
    }

    const result = await mintPositionToken({
      userWallet,
      vaultId,
      vaultName: vaultName ?? `VAULT-${vaultId}`,
      yieldRate: Math.round((yieldRate ?? 9.0) * 100),
      depositedUsd: depositedUsd ?? 0,
    });

    return NextResponse.json({ ok: true, ...result });

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Mint failed";
    console.error("[api/mint/position]", err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}