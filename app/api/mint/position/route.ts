import { NextRequest, NextResponse } from "next/server";

function isValidSolanaAddress(addr: string): boolean {
  if (!addr || typeof addr !== "string") return false;
  const clean = addr.trim();
  return clean.length >= 32 && clean.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(clean);
}

const ASSET_CLASSES: Record<string, string> = {
  "490": "Music IP", "491": "Music IP",
  "492": "Real Estate", "493": "Receivables", "494": "Music IP",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userWallet, vaultId, vaultName, yieldRate, depositedUsd } = body;

    if (!isValidSolanaAddress(userWallet)) {
      return NextResponse.json({ ok: false, error: "Invalid or missing Solana wallet address." }, { status: 400 });
    }
    if (!vaultId) {
      return NextResponse.json({ ok: false, error: "vaultId required" }, { status: 400 });
    }

    const cls       = ASSET_CLASSES[vaultId] ?? "RWA";
    const tokenName = `ABRAXAS ${cls.toUpperCase()} POSITION`;
    const tokenSym  = "ABRAP";

    // Demo mode — VAULT_AUTHORITY_SECRET not configured
    if (!process.env.VAULT_AUTHORITY_SECRET) {
      return NextResponse.json({
        ok: true, demo: true,
        mintAddress:  "DEMO_" + Math.random().toString(36).slice(2, 10).toUpperCase(),
        tokenAccount: userWallet.trim(),
        txSignature:  null, explorerUrl: null,
        tokenName, tokenSymbol: tokenSym,
        message: "Add VAULT_AUTHORITY_SECRET to Vercel env vars to enable live minting.",
      });
    }

    // Live mint — InterestBearingConfig ONLY (no metadata extension)
    // Metadata shown via /api/token-metadata/[vaultId] URI standard
    const {
      Connection, Keypair, PublicKey,
      SystemProgram, Transaction, sendAndConfirmTransaction,
    } = await import("@solana/web3.js");

    const {
      ExtensionType, TOKEN_2022_PROGRAM_ID,
      createInitializeMintInstruction,
      createInitializeInterestBearingMintInstruction,
      getMintLen,
      getAssociatedTokenAddressSync,
      createAssociatedTokenAccountInstruction,
      createMintToInstruction,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    } = await import("@solana/spl-token");

    const rpcUrl    = process.env.SOLANA_RPC_URL ?? process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
    const authority = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.VAULT_AUTHORITY_SECRET!)));
    const connection= new Connection(rpcUrl, "confirmed");
    const userPubkey= new PublicKey(userWallet.trim());
    const mintKp    = Keypair.generate();
    const mint      = mintKp.publicKey;

    // Single extension = smaller account = less rent
    const extensions = [ExtensionType.InterestBearingConfig];
    const mintLen    = getMintLen(extensions);
    const lamports   = await connection.getMinimumBalanceForRentExemption(mintLen);
    const rateInBps  = Math.round((yieldRate ?? 9.0) * 100);

    const userTokenAccount = getAssociatedTokenAddressSync(
      mint, userPubkey, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const tx = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: authority.publicKey,
        newAccountPubkey: mint,
        space: mintLen, lamports,
        programId: TOKEN_2022_PROGRAM_ID,
      }),
      createInitializeInterestBearingMintInstruction(
        mint, authority.publicKey, rateInBps, TOKEN_2022_PROGRAM_ID
      ),
      createInitializeMintInstruction(
        mint, 0, authority.publicKey, null, TOKEN_2022_PROGRAM_ID
      ),
      createAssociatedTokenAccountInstruction(
        authority.publicKey, userTokenAccount, userPubkey,
        mint, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
      ),
      createMintToInstruction(
        mint, userTokenAccount, authority.publicKey, 1, [], TOKEN_2022_PROGRAM_ID
      ),
    );

    const sig = await sendAndConfirmTransaction(
      connection, tx, [authority, mintKp], { commitment: "confirmed" }
    );

    return NextResponse.json({
      ok: true, demo: false,
      mintAddress:   mint.toBase58(),
      tokenAccount:  userTokenAccount.toBase58(),
      txSignature:   sig,
      explorerUrl:   `https://solscan.io/tx/${sig}`,
      tokenName, tokenSymbol: tokenSym,
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Mint failed";
    console.error("[api/mint/position]", err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}