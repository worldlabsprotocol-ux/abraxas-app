// FILE: app/api/helius/route.ts
// Helius webhook ingestion + SSE broadcast.
// POST: Helius pushes events here → stored + broadcast to all SSE clients.
// GET:  Client polls for events since timestamp (fallback if SSE drops).

import { NextRequest, NextResponse } from "next/server";

// In-process event cache
const eventCache: Array<{
  id: string; ts: number; type: string; signature?: string;
  description: string; riskSignal: "low" | "medium" | "high" | "none";
  rawType?: string;
}> = [];

function classifyRisk(type: string): "low" | "medium" | "high" | "none" {
  if (type === "LOAN_FOX" || type === "LIQUIDATION" || type === "ANOMALY") return "high";
  if (type === "NFT_SALE"  || type === "TRANSFER")                          return "medium";
  if (type === "NFT_LISTING" || type === "NFT_MINT" || type === "MINT")      return "low";
  return "none";
}

function describe(tx: Record<string, unknown>): string {
  const type = String(tx.type ?? "UNKNOWN");
  const sig  = String((tx.signature as string | undefined)?.slice(0, 8) ?? "");
  const acct = String((tx.feePayer as string | undefined)?.slice(0, 8) ?? "");
  return `${type}${sig ? ` sig:${sig}…` : ""}${acct ? ` wallet:${acct}…` : ""}`;
}

// Generate agent reasoning trace for the terminal
function agentReasoning(type: string, risk: string): string {
  const ts = new Date().toISOString().slice(11, 19);
  if (risk === "high")   return `[${ts}] [CIRCUIT] ${type} → RISK THRESHOLD BREACHED → EVALUATING RESPONSE`;
  if (risk === "medium") return `[${ts}] [SOPHIA]  ${type} → SIGNAL DETECTED → CORRELATING MARKET DATA`;
  return                        `[${ts}] [SCAN]    ${type} → NOMINAL → CONTINUING MONITOR`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const txs: Array<Record<string, unknown>> = Array.isArray(body) ? body : [body];
    const ingested = [];

    for (const tx of txs) {
      const type       = String(tx.type ?? "UNKNOWN");
      const riskSignal = classifyRisk(type);
      const ev = {
        id:          `hev-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        ts:          Date.now(),
        type,
        signature:   tx.signature as string | undefined,
        description: describe(tx),
        riskSignal,
        reasoning:   agentReasoning(type, riskSignal),
      };
      eventCache.unshift(ev);
      ingested.push(ev);
    }
    eventCache.splice(100);

    // Broadcast to all SSE clients
    try {
      const { broadcast } = await import("@/app/api/stream/route");
      ingested.forEach((ev) => broadcast({ ...ev, source: "helius" }));
    } catch {
      // SSE module not loaded — no active connections, safe to skip
    }

    return NextResponse.json({ ok: true, ingested: ingested.length });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Parse error" }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const since  = parseInt(req.nextUrl.searchParams.get("since") ?? "0", 10);
  const events = since > 0 ? eventCache.filter((e) => e.ts > since) : eventCache.slice(0, 20);
  return NextResponse.json({ ok: true, events, count: events.length }, {
    headers: { "Cache-Control": "no-store" },
  });
}