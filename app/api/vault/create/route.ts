// FILE: app/api/vault/create/route.ts
// Vault creation — self-contained. No @/lib/solana/* imports.
import { NextRequest, NextResponse } from "next/server";
import { PublicKey, Keypair, SystemProgram, Transaction, Connection } from "@solana/web3.js";

function isValidPubkey(s: string): boolean {
  try { new PublicKey(s); return true; } catch { return false; }
}
function fakeBase58(len = 44): string {
  const ch = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let o = ""; for (let i = 0; i < len; i++) o += ch[Math.floor(Math.random() * ch.length)]; return o;
}
function getConn(): Connection {
  const url = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
  return new Connection(url, "confirmed");
}
function agentTypeFromStrategy(s: string): number {
  return s === "aggressive" ? 1 : s === "conservative" ? 2 : 0;
}
function derivePda(owner: PublicKey): [PublicKey, number] {
  const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_ABRAXAS_PROGRAM_ID ?? "11111111111111111111111111111111");
  return PublicKey.findProgramAddressSync([Buffer.from("abraxas_vault"), owner.toBytes()], PROGRAM_ID);
}

export async function POST(req: NextRequest) {
  try {
    const { ownerWallet, strategy = "balanced", apy = 9 } = await req.json();
    if (!isValidPubkey(ownerWallet)) {
      return NextResponse.json({ ok: false, error: "Invalid owner wallet." }, { status: 400 });
    }
    const owner     = new PublicKey(ownerWallet);
    const agentType = agentTypeFromStrategy(strategy);
    const [pdaPubkey] = derivePda(owner);
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
      const conn      = getConn();
      const mintKp    = Keypair.generate();
      const mint      = mintKp.publicKey;
      const mintLen   = getMintLen([ExtensionType.InterestBearingConfig]);
      const lamports  = await conn.getMinimumBalanceForRentExemption(mintLen);
      const ata       = getAssociatedTokenAddressSync(mint, owner, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
      const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");

      const mintTx = new Transaction();
      mintTx.recentBlockhash = blockhash;
      mintTx.lastValidBlockHeight = lastValidBlockHeight;
      mintTx.feePayer = authority.publicKey;
      mintTx.add(
        SystemProgram.createAccount({ fromPubkey: authority.publicKey, newAccountPubkey: mint, space: mintLen, lamports, programId: TOKEN_2022_PROGRAM_ID }),
        createInitializeInterestBearingMintInstruction(mint, authority.publicKey, Math.round(apy * 100), TOKEN_2022_PROGRAM_ID),
        createInitializeMintInstruction(mint, 0, authority.publicKey, null, TOKEN_2022_PROGRAM_ID),
        createAssociatedTokenAccountInstruction(authority.publicKey, ata, owner, mint, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID),
        createMintToInstruction(mint, ata, authority.publicKey, 1, [], TOKEN_2022_PROGRAM_ID),
      );
      const mintSig = await sendAndConfirmTransaction(conn, mintTx, [authority, mintKp], { commitment: "confirmed" });

      // Memo tx for user to sign (proves ownership)
      const MEMO = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
      const memo = JSON.stringify({ protocol:"ABRAXAS", action:"CREATE_VAULT", pda, agentType, mintAddress: mint.toBase58(), riskScore:50, version:1, ts: Date.now() });
      const { blockhash: bh2, lastValidBlockHeight: lvbh2 } = await conn.getLatestBlockhash("confirmed");
      const vaultTx = new Transaction();
      vaultTx.recentBlockhash = bh2;
      vaultTx.lastValidBlockHeight = lvbh2;
      vaultTx.feePayer = owner;
      vaultTx.add({ keys:[{pubkey:owner,isSigner:true,isWritable:false}], programId:MEMO, data:Buffer.from(memo,"utf-8") });

      return NextResponse.json({
        ok: true, simulated: false, pda, mintAddress: mint.toBase58(),
        mintTxSignature: mintSig, mintExplorerUrl: `https://solscan.io/tx/${mintSig}`,
        serialisedTx: vaultTx.serialize({requireAllSignatures:false,verifySignatures:false}).toString("base64"),
        feeEstimate: 5000,
      });
    }

    // Simulation mode
    const mintAddress = fakeBase58(44);
    const fakeSig     = fakeBase58(88);
    return NextResponse.json({ ok:true, simulated:true, pda, mintAddress, mintTxSignature:fakeSig, mintExplorerUrl:`https://solscan.io/tx/${fakeSig}`, serialisedTx:null, feeEstimate:5000 });

  } catch (err) {
    console.error("[api/vault/create]", err);
    return NextResponse.json({ ok:false, error: err instanceof Error ? err.message : "Server error" }, { status:500 });
  }
}