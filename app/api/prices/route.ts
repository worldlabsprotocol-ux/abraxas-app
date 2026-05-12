// FILE: app/api/prices/route.ts
// Server-side price fetcher — avoids CORS issues with CoinGecko.
// Returns crypto + metals prices. Cached for 55s (just under client 60s interval).
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 55;

const METALS_BASE = { GOLD: 4733.39, SILVER: 72.91 }; // May 2026 base

export async function GET() {
  try {
    // CoinGecko free API — no key required
    const cgRes = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,sui&vs_currencies=usd&precision=2",
      { next: { revalidate: 55 } }
    );

    if (!cgRes.ok) throw new Error("CoinGecko unavailable");
    const cg = await cgRes.json();

    return NextResponse.json({
      BTC:    cg.bitcoin?.usd    ?? 80635,
      ETH:    cg.ethereum?.usd   ?? 2323,
      SOL:    cg.solana?.usd     ?? 95,
      SUI:    cg.sui?.usd        ?? 1.27,
      ABRA:   0.021,             // from DEX once live
      GOLD:   METALS_BASE.GOLD,  // metals: base + override when metals API available
      SILVER: METALS_BASE.SILVER,
      source: "coingecko",
      ts:     Date.now(),
    });
  } catch {
    // Return May 2026 fallback values — never fails
    return NextResponse.json({
      BTC:80635, ETH:2323, SOL:95, SUI:1.27, ABRA:0.021,
      GOLD:METALS_BASE.GOLD, SILVER:METALS_BASE.SILVER,
      source: "fallback",
      ts: Date.now(),
    });
  }
}