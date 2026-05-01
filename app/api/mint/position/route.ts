// FILE: app/api/mint/position/route.ts
// Mints a Token-2022 position. Returns mint address + tx signature.
// Real on-chain when VAULT_AUTHORITY_SECRET is set. Otherwise simulated cleanly.

import { NextRequest, NextResponse } from "next/server";

function isValidSolanaAddress(addr: string): boolean {
  if (!addr || typeof addr !== "string") return false;
  const c = addr.trim();
  return c.length >= 32 && c.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(c);
}

const ASSET_BY_VAULT: Record<string, string> = {
  "490": "Music IP",  "491": "Music IP",
  "492": "Real Estate","493": "Receivables","494": "Music IP",
};

function tokenName(vaultId: string): string {
  const a = ASSET_BY_VAULT[vaultId] ?? "RWA";
  return `ABRAXAS ${a.toUpperCase()} POSITION`;
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
    const { userWallet, vaultId, vaultName, yieldRate, depositedUsd } = body;

    if (!isValidSolanaAddress(userWallet)) {
      return NextResponse.json({ ok: false, error: "Invalid wallet address." }, { status: 400 });
    }
    if (!vaultId) {
      return NextResponse.json({ ok: false, error: "vaultId required" }, { status: 400 });
    }

    const name   = tokenName(vaultId);
    const symbol = "ABRAP";

    // SIMULATED MINT — clean, believable, returns realistic data
    if (!process.env.VAULT_AUTHORITY_SECRET) {
      const mintAddress = fakeBase58();
      const txSig       = fakeBase58(88);
      return NextResponse.json({
        ok:           true,
        simulated:    true,
        mintAddress,
        tokenAccount: fakeBase58(),
        txSignature:  txSig,
        explorerUrl:  `https://solscan.io/tx/${txSig}`,
        tokenName:    name,
        tokenSymbol:  symbol,
        metadataUri:  `/api/token-metadata/${vaultId}`,
        vaultId,
        vaultName,
        yieldRate,
        depositedUsd,
      });
    }

    // LIVE MINT
    const { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } = await import("@solana/web3.js");
    const {
      ExtensionType, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
      createInitializeMintInstruction,
      createInitializeInterestBearingMintInstruction,
      getMintLen,
      getAssociatedTokenAddressSync,
      createAssociatedTokenAccountInstruction,
      createMintToInstruction,
    } = await import("@solana/spl-token");

    const rpcUrl    = process.env.SOLANA_RPC_URL ?? process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
    const authority = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.VAULT_AUTHORITY_SECRET!)));
    const connection= new Connection(rpcUrl, "confirmed");
    const userPubkey= new PublicKey(userWallet.trim());
    const mintKp    = Keypair.generate();
    const mint      = mintKp.publicKey;

    const extensions = [ExtensionType.InterestBearingConfig];
    const mintLen    = getMintLen(extensions);
    const lamports   = await connection.getMinimumBalanceForRentExemption(mintLen);
    const rateInBps  = Math.round((yieldRate ?? 9.0) * 100);

    const userTokenAccount = getAssociatedTokenAddressSync(
      mint, userPubkey, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const tx = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey:       authority.publicKey,
        newAccountPubkey: mint,
        space:            mintLen,
        lamports,
        programId:        TOKEN_2022_PROGRAM_ID,
      }),
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
      tokenName:    name,
      tokenSymbol:  symbol,
      metadataUri:  `/api/token-metadata/${vaultId}`,
      vaultId, vaultName, yieldRate, depositedUsd,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Mint failed";
    console.error("[api/mint/position]", err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}