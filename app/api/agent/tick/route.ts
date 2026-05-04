// FILE: app/api/agent/tick/route.ts
// Vercel Cron endpoint. Configure in vercel.json:
//   { "crons": [{ "path": "/api/agent/tick", "schedule": "*/5 * * * *" }] }
//
// HELIUS WEBHOOK: Register at https://api.helius.xyz/v0/webhooks
//   webhookURL: https://your-app.vercel.app/api/agent/tick
//   transactionTypes: ["NFT_SALE","LOAN_FOX"]
//   accountAddresses: [VAULT_AUTHORITY_PUBKEY]
// This fires only on relevant events — zero wasted compute vs polling.

import { NextRequest, NextResponse } from "next/server";
import { getBestOfferAcrossProtocols, refinanceIfBetter } from "@/lib/adapters/AdapterFactory";

const HEALTH_FACTOR_FLOOR = 1.2;  // auto-repay below this
const MAX_LTV_HARD_CAP    = 0.70; // never borrow > 70% of floor

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const logs: Array<{ ts: number; action: string; detail: string; tx?: string }> = [];
  const log = (action: string, detail: string, tx?: string) => {
    logs.push({ ts: Date.now(), action, detail, tx });
    console.log(`[agent/tick] ${action}: ${detail}${tx ? ` tx=${tx}` : ""}`);
  };

  try {
    const body = await req.json().catch(() => ({}));
    if (body?.type) log("webhook_trigger", `Helius event: ${body.type}`);

    // ── Buy-and-Borrow signal detection ──────────────────────────────────────
    const collateralMint = body?.collateralMint as string | undefined;
    if (collateralMint) {
      const best = await getBestOfferAcrossProtocols(collateralMint);
      if (best) {
        const physicalFloor = (body?.physicalFloor as number) ?? 6_000_000_000;
        const maxSafeBorrow = Math.floor(physicalFloor * MAX_LTV_HARD_CAP);
        const borrowAmount  = Math.min(best.offer.maxBorrow, maxSafeBorrow);
        log("best_offer", `${best.adapter.name} @ ${best.offer.ltvPercent}% LTV ${best.offer.aprPercent}% APR — max safe borrow: ${(borrowAmount/1e9).toFixed(2)} SOL`, best.offer.offerPubkey);
        // Real execution: await best.adapter.executeLoan({ offer: best.offer, collateralMint, borrowAmount, borrowerWallet: body.borrowerWallet })
      } else {
        log("no_offer", "No lending offers found for collateral");
      }
    }

    // ── Health monitor + auto-repay ───────────────────────────────────────────
    const activeLoans: Array<{ loanPubkey: string; protocol: string; debt: number; collateral: string; healthFactor: number }> = body?.activeLoans ?? [];
    for (const loan of activeLoans) {
      if (loan.healthFactor < HEALTH_FACTOR_FLOOR) {
        log("auto_repay", `Loan ${loan.loanPubkey} health=${loan.healthFactor.toFixed(2)} — executing repay`);
        // Real: await getAdapter(loan.protocol).repayLoan(...)
      }
      if (collateralMint && body?.borrowerWallet) {
        const refi = await refinanceIfBetter(
          { protocol: loan.protocol, loanPubkey: loan.loanPubkey, principal: loan.debt, debt: loan.debt, collateralMint: loan.collateral, healthFactor: loan.healthFactor, dueAt: 0 },
          loan.protocol, loan.collateral, body.borrowerWallet
        );
        if (refi.refinanced) {
          log("refinanced", `${loan.protocol} → ${refi.newProtocol}`, refi.txSignature);
        }
      }
    }

    return NextResponse.json({ ok: true, logs });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err), logs }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "Agent tick active. POST to trigger." });
}