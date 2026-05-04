// FILE: app/api/vault/create/route.ts
// Builds vault creation tx + mints Token-2022 vault NFT.
// Live when VAULT_AUTHORITY_SECRET set. Simulated otherwise.

import { NextRequest, NextResponse } from "next/server";
import { PublicKey, Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import { withFallback } from "@/lib/solana/rpc";
import { deriveVaultPda, agentTypeFromStrategy } from "@/lib/solana/vaultPda";
import { buildCreateVaultTx, simulateTx, serialiseTx } from "@/lib/solana/txBuilder";

function isValidPubkey(s: string): boolean {
  try { new PublicKey(s); return true; } catch { return false; }
}
function fakeBase58(len = 44): string {
  const ch = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let o = ""; for (let i = 0; i < len; i++) o += ch[Math.floor(Math.random() * ch.length)]; return o;
}

export async function POST(req: NextRequest) {
  try {
    const { ownerWallet, strategy = "balanced", apy = 9 } = await req.json();
    if (!isValidPubkey(ownerWallet)) {
      return NextResponse.json({ ok: false, error: "Invalid owner wallet." }, { status: 400 });
    }

    const owner     = new PublicKey(ownerWallet);
    const agentType = agentTypeFromStrategy(strategy);
    const [pdaPubkey] = deriveVaultPda(owner);
    const pda       = pdaPubkey.toBase58();

    if (process.env.VAULT_AUTHORITY_SECRET) {
      const {
        ExtensionType, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
        createInitializeMintInstruction, createInitializeInterestBearingMintInstruction,
        getMintLen, getAssociatedTokenAddressSync,
        createAssociatedTokenAccountInstruction, createMintToInstruction,
      } = await import("@solana/spl-token");
      const { sendAndConfirmTransaction } = await import("@solana/web3.js");
      const authority = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.VAULT_AUTHORITY_SECRET)));

      const result = await withFallback(async (conn) => {
        const mintKp    = Keypair.generate();
        const mint      = mintKp.publicKey;
        const extensions = [ExtensionType.InterestBearingConfig];
        const mintLen   = getMintLen(extensions);
        const lamports  = await conn.getMinimumBalanceForRentExemption(mintLen);
        const rateInBps = Math.round(apy * 100);
        const ata       = getAssociatedTokenAddressSync(mint, owner, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
        const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");

        const mintTx = new Transaction();
        mintTx.recentBlockhash = blockhash;
        mintTx.lastValidBlockHeight = lastValidBlockHeight;
        mintTx.feePayer = authority.publicKey;
        mintTx.add(
          SystemProgram.createAccount({ fromPubkey: authority.publicKey, newAccountPubkey: mint, space: mintLen, lamports, programId: TOKEN_2022_PROGRAM_ID }),
          createInitializeInterestBearingMintInstruction(mint, authority.publicKey, rateInBps, TOKEN_2022_PROGRAM_ID),
          createInitializeMintInstruction(mint, 0, authority.publicKey, null, TOKEN_2022_PROGRAM_ID),
          createAssociatedTokenAccountInstruction(authority.publicKey, ata, owner, mint, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID),
          createMintToInstruction(mint, ata, authority.publicKey, 1, [], TOKEN_2022_PROGRAM_ID),
        );

        const mintSig     = await sendAndConfirmTransaction(conn, mintTx, [authority, mintKp], { commitment: "confirmed" });
        const mintAddress = mint.toBase58();
        const vaultTx     = await buildCreateVaultTx({ connection: conn, owner, pda, agentType, mintAddress });
        const sim         = await simulateTx(conn, vaultTx);

        return { ok: true, simulated: false, pda, mintAddress, mintTxSignature: mintSig, mintExplorerUrl: `https://solscan.io/tx/${mintSig}`, serialisedTx: serialiseTx(vaultTx), simulation: sim, feeEstimate: sim.feeEstimate };
      });

      return NextResponse.json(result);
    }

    // Simulation mode
    const mintAddress = fakeBase58(44);
    const fakeSig     = fakeBase58(88);
    return NextResponse.json({ ok: true, simulated: true, pda, mintAddress, mintTxSignature: fakeSig, mintExplorerUrl: `https://solscan.io/tx/${fakeSig}`, serialisedTx: null, simulation: { ok: true, unitsConsumed: 1200, logs: ["Simulation mode — VAULT_AUTHORITY_SECRET not set"], error: null, feeEstimate: 5000 }, feeEstimate: 5000 });

  } catch (err) {
    console.error("[api/vault/create]", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Server error" }, { status: 500 });
  }
}