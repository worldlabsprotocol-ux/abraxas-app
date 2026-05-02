// FILE: app/api/mint/position/route.ts
// Mints Token-2022 ABRAP position token.
// ABRAP represents ownership of a vault position — NOT a stablecoin.
// Metadata includes all position fields so wallet display matches UI.
// SIMULATED when VAULT_AUTHORITY_SECRET not set.

import { NextRequest, NextResponse } from "next/server";
import type { ABRAPMetadata } from "@/lib/protocolService";

function isValidSolanaAddress(addr: string): boolean {
  if (!addr || typeof addr !== "string") return false;
  const c = addr.trim();
  return c.length >= 32 && c.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(c);
}

function fakeBase58(len = 44): string {
  const ch = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let out = "";
  for (let i = 0; i < len; i++) out += ch[Math.floor(Math.random() * ch.length)];
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userWallet, vaultId, vaultName, assetType, principal, apy, displayName, description } = body;

    if (!isValidSolanaAddress(userWallet)) {
      return NextResponse.json({ ok: false, error: "Invalid wallet address." }, { status: 400 });
    }
    if (!vaultId || !principal || principal <= 0) {
      return NextResponse.json({ ok: false, error: "vaultId and principal required." }, { status: 400 });
    }

    const positionName = displayName || `${assetType} Position — ${vaultName}`;
    const tokenName    = `ABRAXAS ${(assetType || "RWA").toUpperCase()} POSITION`;
    const tokenSymbol  = "ABRAP";

    const metadata: ABRAPMetadata = {
      name:            positionName,
      symbol:          tokenSymbol,
      description:     description || `Abraxas vault position. ${vaultName} · ${apy}% APY · ${assetType}.`,
      image:           "https://abraxas-app.vercel.app/icon.png",
      vaultId,
      vaultName,
      assetType,
      depositedAmount: principal,
      ownerWallet:     userWallet,
      apy,
      createdAt:       new Date().toISOString(),
      status:          "active",
    };

    // ── SIMULATED MODE ────────────────────────────────────────────────────────
    if (!process.env.VAULT_AUTHORITY_SECRET) {
      const mintAddress  = fakeBase58(44);
      const txSignature  = fakeBase58(88);
      return NextResponse.json({
        ok:           true,
        simulated:    true,
        mintAddress,
        tokenAccount: fakeBase58(44),
        txSignature,
        explorerUrl:  `https://solscan.io/tx/${txSignature}`,
        tokenName,
        tokenSymbol,
        metadata,
        message: "Simulated — add VAULT_AUTHORITY_SECRET to Vercel for live minting.",
      });
    }

    // ── LIVE MINT ─────────────────────────────────────────────────────────────
    // Uses InterestBearingConfig only — metadata served via /api/token-metadata/[vaultId]
    const { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } = await import("@solana/web3.js");
    const { ExtensionType, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, createInitializeMintInstruction, createInitializeInterestBearingMintInstruction, getMintLen, getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction, createMintToInstruction } = await import("@solana/spl-token");

    const rpcUrl    = process.env.SOLANA_RPC_URL ?? process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
    const authority = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.VAULT_AUTHORITY_SECRET!)));
    const connection= new Connection(rpcUrl, "confirmed");
    const userPubkey= new PublicKey(userWallet.trim());
    const mintKp    = Keypair.generate();
    const mint      = mintKp.publicKey;

    const extensions = [ExtensionType.InterestBearingConfig];
    const mintLen    = getMintLen(extensions);
    const lamports   = await connection.getMinimumBalanceForRentExemption(mintLen);
    const rateInBps  = Math.round((apy ?? 9.0) * 100);

    const userTokenAccount = getAssociatedTokenAddressSync(mint, userPubkey, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

    const tx = new Transaction().add(
      SystemProgram.createAccount({ fromPubkey: authority.publicKey, newAccountPubkey: mint, space: mintLen, lamports, programId: TOKEN_2022_PROGRAM_ID }),
      createInitializeInterestBearingMintInstruction(mint, authority.publicKey, rateInBps, TOKEN_2022_PROGRAM_ID),
      createInitializeMintInstruction(mint, 0, authority.publicKey, null, TOKEN_2022_PROGRAM_ID),
      createAssociatedTokenAccountInstruction(authority.publicKey, userTokenAccount, userPubkey, mint, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID),
      createMintToInstruction(mint, userTokenAccount, authority.publicKey, 1, [], TOKEN_2022_PROGRAM_ID),
    );

    const sig = await sendAndConfirmTransaction(connection, tx, [authority, mintKp], { commitment: "confirmed" });

    return NextResponse.json({
      ok:           true,
      simulated:    false,
      mintAddress:  mint.toBase58(),
      tokenAccount: userTokenAccount.toBase58(),
      txSignature:  sig,
      explorerUrl:  `https://solscan.io/tx/${sig}`,
      tokenName,
      tokenSymbol,
      metadata,
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Mint failed";
    console.error("[api/mint/position]", err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}