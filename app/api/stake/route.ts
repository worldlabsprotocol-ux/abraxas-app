// FILE: app/api/stake/route.ts
// Stake management endpoint.
// POST /api/stake        → stake a card
// DELETE /api/stake      → unstake a card
// GET /api/stake?id=...  → get stake status + accrued yield
// $ABRA yield accrues at stakeApy% APY, boosted by Circuit protection.

import { NextRequest, NextResponse } from "next/server";
import { broadcast } from "@/lib/sseRegistry";

interface StakeRecord {
  id:         string;
  cardId:     string;
  cardName:   string;
  stakedAt:   number;
  yieldPct:   number;   // base APY
  status:     "PROTECTED" | "UNPROTECTED";
  abraAccrued:number;
  agentId:    string;
}

const stakes = new Map<string, StakeRecord>();

function calcYield(rec: StakeRecord): number {
  const elapsed  = (Date.now() - rec.stakedAt) / (365 * 24 * 3600 * 1000);
  const multiplier = rec.status === "PROTECTED" ? 1.2 : 1.0; // +20% boost when protected
  return Math.round(elapsed * rec.yieldPct * multiplier * 10_000) / 10_000;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { cardId, cardName, yieldPct, status } = await req.json();
    if (!cardId) return NextResponse.json({ ok: false, error: "cardId required" }, { status: 400 });

    const existing = stakes.get(cardId);
    if (existing) return NextResponse.json({ ok: false, error: "Already staked" }, { status: 409 });

    const agents = ["SOPHIA-HED", "SOPHIA-REB", "SOPHIA-YLD", "SOPHIA-CGD"];
    const rec: StakeRecord = {
      id:          `stake-${Date.now().toString(36)}`,
      cardId, cardName,
      stakedAt:    Date.now(),
      yieldPct:    yieldPct ?? 12,
      status:      status ?? "UNPROTECTED",
      abraAccrued: 0,
      agentId:     agents[Math.floor(Math.random() * agents.length)],
    };

    stakes.set(cardId, rec);

    broadcast({ type: "STAKE_OPENED", ts: Date.now(), riskSignal: "none", source: "helius", description: `${cardName} staked at ${rec.yieldPct}% APY — ${rec.agentId} assigned` });

    return NextResponse.json({ ok: true, stake: rec });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    const { cardId } = await req.json();
    const rec = stakes.get(cardId);
    if (!rec) return NextResponse.json({ ok: false, error: "Stake not found" }, { status: 404 });
    const abraAccrued = calcYield(rec);
    stakes.delete(cardId);
    broadcast({ type: "STAKE_CLOSED", ts: Date.now(), riskSignal: "none", source: "helius", description: `${rec.cardName} unstaked — ${abraAccrued.toFixed(4)} $ABRA accrued` });
    return NextResponse.json({ ok: true, abraAccrued });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const cardId = req.nextUrl.searchParams.get("id");
  if (cardId) {
    const rec = stakes.get(cardId);
    if (!rec) return NextResponse.json({ ok: false, staked: false });
    return NextResponse.json({ ok: true, staked: true, stake: rec, abraAccrued: calcYield(rec) });
  }
  // Return all stakes with live yield
  const all = Array.from(stakes.values()).map((r) => ({ ...r, abraAccrued: calcYield(r) }));
  return NextResponse.json({ ok: true, stakes: all });
}