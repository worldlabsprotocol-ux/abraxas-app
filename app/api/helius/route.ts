// FILE: app/api/helius/route.ts
// Helius webhook ingestion endpoint.
// Register at: https://dev.helius.xyz/webhooks/overview
//   POST https://api.helius.xyz/v0/webhooks
//   { "webhookURL": "https://abraxas-app.vercel.app/api/helius",
//     "transactionTypes": ["NFT_SALE","NFT_LISTING","TRANSFER","LOAN"],
//     "accountAddresses": [VAULT_AUTHORITY_PUBKEY] }
//
// Events are stored server-side and polled by the client via GET.
// No WebSocket needed — Next.js edge-compatible.

import { NextRequest, NextResponse } from "next/server";

// In-process cache (resets per cold start — fine for hackathon)
// For production: replace with Redis or Upstash
const eventCache: Array<{
  id: string; ts: number; type: string; signature?: string;
  wallet?: string; amount?: number; description: string;
  riskSignal: "low" | "medium" | "high" | "none";
}> = [];

function classifyRisk(event: Record<string, unknown>): "low" | "medium" | "high" | "none" {
  const type = String(event.type ?? "");
  if (type === "LOAN_FOX" || type === "LIQUIDATION")    return "high";
  if (type === "NFT_SALE" || type === "TRANSFER")        return "medium";
  if (type === "NFT_LISTING" || type === "NFT_MINT")     return "low";
  return "none";
}

function describe(event: Record<string, unknown>): string {
  const type = String(event.type ?? "UNKNOWN");
  const sig   = String((event.signature as string | undefined)?.slice(0, 8) ?? "");
  return `${type}${sig ? ` — ${sig}…` : ""}`;
}

// POST — Helius pushes events here
export async function POST(req: NextRequest) {
  // Optional: verify Helius signature header
  // const heliusSecret = req.headers.get("helius-secret");
  // if (process.env.HELIUS_SECRET && heliusSecret !== process.env.HELIUS_SECRET) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // }

  try {
    const body = await req.json();
    // Helius sends an array of transactions
    const txs: Array<Record<string, unknown>> = Array.isArray(body) ? body : [body];

    for (const tx of txs) {
      const riskSignal = classifyRisk(tx);
      eventCache.unshift({
        id:          `hev-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        ts:          Date.now(),
        type:        String(tx.type ?? "UNKNOWN"),
        signature:   tx.signature as string | undefined,
        wallet:      (tx.feePayer ?? tx.accountData) as string | undefined,
        amount:      tx.nativeTransfers ? (tx.nativeTransfers as Array<{amount:number}>)[0]?.amount : undefined,
        description: describe(tx),
        riskSignal,
      });
    }

    // Keep last 100 events
    eventCache.splice(100);

    return NextResponse.json({ ok: true, ingested: txs.length });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Parse error" }, { status: 400 });
  }
}

// GET — client polls for latest events
export async function GET(req: NextRequest) {
  const since  = parseInt(req.nextUrl.searchParams.get("since") ?? "0", 10);
  const events = since > 0 ? eventCache.filter((e) => e.ts > since) : eventCache.slice(0, 20);
  return NextResponse.json({ ok: true, events, count: events.length }, {
    headers: { "Cache-Control": "no-store" },
  });
}