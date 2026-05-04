// FILE: app/api/vault/update/route.ts
// Vault state update — self-contained. No @/lib/solana/* imports.
import { NextRequest, NextResponse } from "next/server";
import { PublicKey, Transaction, Connection } from "@solana/web3.js";

function isValidPubkey(s: string): boolean {
  try { new PublicKey(s); return true; } catch { return false; }
}
function fakeBase58(len = 88): string {
  const ch = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let o = ""; for (let i = 0; i < len; i++) o += ch[Math.floor(Math.random() * ch.length)]; return o;
}
function clamp(n: number): number { return Math.max(0, Math.min(100, Math.round(n))); }
function circuitStateFromScore(s: number): number { return s >= 75 ? 3 : s >= 50 ? 2 : s >= 25 ? 1 : 0; }
function deterministicReduction(strategy: string, seed: number): number {
  const ranges: Record<string, [number, number]> = {
    balanced: [20, 30], aggressive: [30, 40], conservative: [10, 20],
  };
  const [min, max] = ranges[strategy] ?? ranges.balanced;
  const x = Math.abs(Math.sin(seed * 9301 + 49297)) % 1;
  return Math.round(min + x * (max - min));
}
function getConn(): Connection {
  const url = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
  return new Connection(url, "confirmed");
}

export async function POST(req: NextRequest) {
  try {
    const { ownerWallet, pda, riskScorePrev, riskEventDelta, strategy = "balanced", agentAction = "Hedge response" } = await req.json();
    if (!isValidPubkey(ownerWallet)) {
      return NextResponse.json({ ok:false, error:"Invalid owner wallet." }, { status:400 });
    }
    const afterEvent   = clamp(riskScorePrev + riskEventDelta);
    const reduction    = deterministicReduction(strategy, Date.now());
    const riskScoreNew = clamp(afterEvent - reduction);
    const circuitState = circuitStateFromScore(riskScoreNew);

    if (!process.env.VAULT_AUTHORITY_SECRET) {
      const fakeSig = fakeBase58();
      return NextResponse.json({ ok:true, simulated:true, riskScorePrev, riskScoreNew, reduction, circuitState, txSignature:fakeSig, explorerUrl:`https://solscan.io/tx/${fakeSig}`, serialisedTx:null });
    }

    const owner = new PublicKey(ownerWallet);
    const conn  = getConn();
    const MEMO  = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
    const memo  = JSON.stringify({ protocol:"ABRAXAS", action:"UPDATE_VAULT", pda, riskScorePrev, riskScoreNew, circuitState, agentAction, strategy, ts:Date.now() });
    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
    const tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.feePayer = owner;
    tx.add({ keys:[{pubkey:owner,isSigner:true,isWritable:false}], programId:MEMO, data:Buffer.from(memo,"utf-8") });

    return NextResponse.json({
      ok:true, simulated:false, riskScorePrev, riskScoreNew, reduction, circuitState,
      serialisedTx: tx.serialize({requireAllSignatures:false,verifySignatures:false}).toString("base64"),
    });

  } catch (err) {
    console.error("[api/vault/update]", err);
    return NextResponse.json({ ok:false, error: err instanceof Error ? err.message : "Server error" }, { status:500 });
  }
}