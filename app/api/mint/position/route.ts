import { NextRequest, NextResponse } from "next/server";

function isValidSolanaAddress(addr: string): boolean {
  if (!addr || typeof addr !== "string") return false;
  const clean = addr.trim();
  return clean.length >= 32 && clean.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(clean);
}

// Token metadata per vault / asset class — makes it visible in Phantom/Solflare
function getTokenMetadata(vaultId: string, vaultName: string, yieldRate: number, depositedUsd: number) {
  const assetClass: Record<string, string> = {
    "490": "Music IP Royalties",
    "491": "Music IP Royalties",
    "492": "Real Estate",
    "493": "Receivables",
    "494": "Music IP Royalties",
  };
  const cls = assetClass[vaultId] ?? "RWA";
  return {
    name:        `ABRAXAS ${cls.toUpperCase()} POSITION`,
    symbol:      "ABRAP",
    description: `Abraxas vault position — ${vaultName} · ${yieldRate}% APY · ${cls} · Non-custodial · Solana Token-2022`,
    image:       "https://abraxas-app.vercel.app/icon.png", // uses existing favicon
    attributes: [
      { trait_type: "Vault",       value: vaultName       },
      { trait_type: "Asset Class", value: cls             },
      { trait_type: "APY",         value: `${yieldRate}%` },
      { trait_type: "Standard",    value: "Token-2022"    },
      { trait_type: "Custody",     value: "Non-custodial" },
    ],
  };
}

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

    const meta = getTokenMetadata(vaultId, vaultName ?? `VAULT-${vaultId}`, yieldRate ?? 9.0, depositedUsd ?? 0);

    // Demo mode
    if (!process.env.VAULT_AUTHORITY_SECRET) {
      const demoMint = "DEMO_" + Math.random().toString(36).slice(2, 10).toUpperCase();
      return NextResponse.json({
        ok: true, demo: true,
        mintAddress:  demoMint,
        tokenAccount: userWallet.trim(),
        txSignature:  null,
        explorerUrl:  null,
        tokenName:    meta.name,
        tokenSymbol:  meta.symbol,
        message:      "Add VAULT_AUTHORITY_SECRET to Vercel to enable live minting.",
      });
    }

    // Live mint with Token-2022 + metadata
    const {
      Connection, Keypair, PublicKey,
      SystemProgram, Transaction, sendAndConfirmTransaction,
    } = await import("@solana/web3.js");

    const {
      ExtensionType, TOKEN_2022_PROGRAM_ID,
      createInitializeMintInstruction,
      createInitializeInterestBearingMintInstruction,
      createInitializeMetadataPointerInstruction,
      getMintLen,
      getAssociatedTokenAddressSync,
      createAssociatedTokenAccountInstruction,
      createMintToInstruction,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    } = await import("@solana/spl-token");

    // Token metadata instruction from spl-token-metadata (bundled in spl-token 0.4.x)
    const { createInitializeInstruction, pack } = await import("@solana/spl-token-metadata");

    const rpcUrl    = process.env.SOLANA_RPC_URL ?? process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
    const authority = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.VAULT_AUTHORITY_SECRET!)));
    const connection= new Connection(rpcUrl, "confirmed");
    const userPubkey= new PublicKey(userWallet.trim());
    const mintKp    = Keypair.generate();
    const mint      = mintKp.publicKey;

    const metadataExt = {
      mint:             mint,
      name:             meta.name,
      symbol:           meta.symbol,
      uri:              `https://abraxas-app.vercel.app/api/token-metadata/${vaultId}`,
      additionalMetadata: [],
    };

    const extensions  = [ExtensionType.InterestBearingConfig, ExtensionType.MetadataPointer];
    const mintLen     = getMintLen(extensions);
    const metaLen     = pack(metadataExt).length;
    const lamports    = await connection.getMinimumBalanceForRentExemption(mintLen + 2 + metaLen);
    const rateInBps   = Math.round((yieldRate ?? 9.0) * 100);

    const userTokenAccount = getAssociatedTokenAddressSync(
      mint, userPubkey, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const tx = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: authority.publicKey, newAccountPubkey: mint,
        space: mintLen, lamports, programId: TOKEN_2022_PROGRAM_ID,
      }),
      createInitializeMetadataPointerInstruction(
        mint, authority.publicKey, mint, TOKEN_2022_PROGRAM_ID
      ),
      createInitializeInterestBearingMintInstruction(
        mint, authority.publicKey, rateInBps, TOKEN_2022_PROGRAM_ID
      ),
      createInitializeMintInstruction(
        mint, 0, authority.publicKey, null, TOKEN_2022_PROGRAM_ID
      ),
      createInitializeInstruction({
        programId: TOKEN_2022_PROGRAM_ID,
        metadata:  mint,
        updateAuthority: authority.publicKey,
        mint, mintAuthority: authority.publicKey,
        name: meta.name, symbol: meta.symbol,
        uri:  metadataExt.uri,
      }),
      createAssociatedTokenAccountInstruction(
        authority.publicKey, userTokenAccount, userPubkey,
        mint, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
      ),
      createMintToInstruction(
        mint, userTokenAccount, authority.publicKey, 1, [], TOKEN_2022_PROGRAM_ID
      ),
    );

    const sig = await sendAndConfirmTransaction(connection, tx, [authority, mintKp], { commitment: "confirmed" });

    return NextResponse.json({
      ok: true, demo: false,
      mintAddress:  mint.toBase58(),
      tokenAccount: userTokenAccount.toBase58(),
      txSignature:  sig,
      explorerUrl:  `https://solscan.io/tx/${sig}`,
      tokenName:    meta.name,
      tokenSymbol:  meta.symbol,
      tokenUri:     metadataExt.uri,
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Mint failed";
    console.error("[api/mint/position]", err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}