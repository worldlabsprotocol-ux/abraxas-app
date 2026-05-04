// FILE: app/api/vault/update/route.ts
// Builds vault state update tx (risk event + Sophia response).
// Returns serialised tx for user to sign, or simulated result.

import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { withFallback } from "@/lib/solana/rpc";
import { buildUpdateVaultTx, simulateTx, serialiseTx } from "@/lib/solana/txBuilder";
import { circuitStateFromScore, clampRiskScore, STRATEGY_REDUCTION } from "@/lib/solana/vaultPda";

function isValidPubkey(s: string): boolean {
  try { new PublicKey(s); return true; } catch { return false; }
}
function fakeBase58(len = 88): string {
  const ch = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let o = ""; for (let i = 0; i < len; i++) o += ch[Math.floor(Math.random() * ch.length)]; return o;
}
// Bounded deterministic reduction (no uncontrolled Math.random)
function deterministicReduction(strategy: string, seed: number): number {
  const r = STRATEGY_REDUCTION[strategy] ?? STRATEGY_REDUCTION.balanced;
  const x = Math.abs(Math.sin(seed * 9301 + 49297)) % 1;
  return Math.round(r.min + x * (r.max - r.min));
}

export async function POST(req: NextRequest) {
  try {
    const { ownerWallet, pda, riskScorePrev, riskEventDelta, strategy = "balanced", agentAction = "Hedge response" } = await req.json();

    if (!isValidPubkey(ownerWallet)) {
      return NextResponse.json({ ok: false, error: "Invalid owner wallet." }, { status: 400 });
    }

    // Checked arithmetic — bounds enforced server-side
    const afterEvent   = clampRiskScore(riskScorePrev + riskEventDelta);
    const reduction    = deterministicReduction(strategy, Date.now());
    const riskScoreNew = clampRiskScore(afterEvent - reduction);
    const circuitState = circuitStateFromScore(riskScoreNew);

    if (!process.env.VAULT_AUTHORITY_SECRET) {
      // Simulation mode — no tx built, instant state
      const fakeSig = fakeBase58();
      return NextResponse.json({
        ok: true, simulated: true,
        riskScorePrev, riskScoreNew, reduction, circuitState,
        txSignature: fakeSig, explorerUrl: `https://solscan.io/tx/${fakeSig}`,
        serialisedTx: null,
        simulation: { ok: true, unitsConsumed: 800, logs: ["Simulation mode"], error: null, feeEstimate: 5000 },
      });
    }

    // Live path — build tx for user to sign
    const owner  = new PublicKey(ownerWallet);
    const result = await withFallback(async (conn) => {
      const tx  = await buildUpdateVaultTx({ connection: conn, owner, pda, riskScorePrev, riskScoreNew, circuitState, agentAction, strategy });
      const sim = await simulateTx(conn, tx);
      return { ok: true, simulated: false, riskScorePrev, riskScoreNew, reduction, circuitState, serialisedTx: sim.ok ? serialiseTx(tx) : null, simulation: sim };
    });

    return NextResponse.json(result);

  } catch (err) {
    console.error("[api/vault/update]", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Server error" }, { status: 500 });
  }
}