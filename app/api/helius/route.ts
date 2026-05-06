// FILE: app/api/helius/route.ts
// Helius webhook ingestion endpoint.
// POST: receives Helius events → stores → broadcasts to SSE clients via sseRegistry.
// GET:  client fallback poll for events since timestamp.

import { NextRequest, NextResponse } from "next/server";
import { broadcast } from "@/lib/sseRegistry";

const eventCache: Array<{
  id: string; ts: number; type: string;
  signature?: string; description: string;
  riskSignal: "low" | "medium" | "high" | "none";
  reasoning: string;
}> = [];

function classifyRisk(type: string): "low" | "medium" | "high" | "none" {
  if (["LOAN_FOX","LIQUIDATION","ANOMALY"].includes(type))    return "high";
  if (["NFT_SALE","TRANSFER"].includes(type))                 return "medium";
  if (["NFT_LISTING","NFT_MINT","MINT"].includes(type))       return "low";
  return "none";
}

function describe(tx: Record<string, unknown>): string {
  const type = String(tx.type ?? "UNKNOWN");
  const sig  = (tx.signature as string | undefined)?.slice(0, 8);
  const acct = (tx.feePayer  as string | undefined)?.slice(0, 8);
  return `${type}${sig ? ` sig:${sig}…` : ""}${acct ? ` wallet:${acct}…` : ""}`;
}

function agentReasoning(type: string, risk: "low" | "medium" | "high" | "none"): string {
  const ts = new Date().toISOString().slice(11, 19);
  if (risk === "high")   return `[${ts}] [CIRCUIT] ${type} → RISK THRESHOLD BREACHED → EVALUATING RESPONSE`;
  if (risk === "medium") return `[${ts}] [SOPHIA]  ${type} → SIGNAL DETECTED → CORRELATING MARKET DATA`;
  return                        `[${ts}] [SCAN]    ${type} → NOMINAL → CONTINUING MONITOR`;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const txs: Array<Record<string, unknown>> = Array.isArray(body) ? body : [body];

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
      // Broadcast to all connected SSE clients immediately
      broadcast({ ...ev, source: "helius" });
    }

    eventCache.splice(100);
    return NextResponse.json({ ok: true, ingested: txs.length });

  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Parse error" },
      { status: 400 }
    );
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const since  = parseInt(req.nextUrl.searchParams.get("since") ?? "0", 10);
  const events = since > 0
    ? eventCache.filter((e) => e.ts > since)
    : eventCache.slice(0, 20);

  return NextResponse.json({ ok: true, events, count: events.length }, {
    headers: { "Cache-Control": "no-store" },
  });
}