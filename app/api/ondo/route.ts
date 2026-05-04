// FILE: app/api/ondo/route.ts
// Fetches Ondo $USDY and $OUSG token data directly from Solana RPC.
// Zero cost — no Ondo API key required. Uses on-chain mint account metadata.
// Cached 5 minutes at the edge.

import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";

const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL
         ?? process.env.SOLANA_RPC_URL
         ?? "https://api.mainnet-beta.solana.com";

// Ondo token mints on Solana mainnet
const ONDO_TOKENS = [
  {
    symbol:  "$USDY",
    name:    "Ondo US Dollar Yield",
    mint:    "A1KLoBrKBde8Ty9qtNQUtq3C2ortoC3u7twggz7sEto6",
    backing: "BlackRock + Fidelity",
    baseApy: 5.20,
    category:"stable",
    description: "Tokenized US Treasury yield. Daily accrual. Instant T+0 redemption.",
  },
  {
    symbol:  "$OUSG",
    name:    "Ondo Short-Term US Government Bond",
    mint:    "9d3tHkKECKBJ7TFe5PghXQCGEaFq4SrPHqMmvQzQYkHM",
    backing: "BlackRock",
    baseApy: 5.08,
    category:"stable",
    description: "Institutional short-term US government securities. T+1 settlement.",
  },
];

async function getTokenSupply(conn: Connection, mintAddress: string): Promise<number | null> {
  try {
    const mint   = new PublicKey(mintAddress);
    const supply = await conn.getTokenSupply(mint);
    return supply.value.uiAmount;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const conn = new Connection(RPC, "confirmed");

    const tokens = await Promise.all(
      ONDO_TOKENS.map(async (t) => {
        const supply = await getTokenSupply(conn, t.mint);
        return {
          ...t,
          // Daily yield accrual — deterministic from base APY
          dailyYield: (t.baseApy / 365).toFixed(4),
          // Circulating supply from on-chain mint account
          circulatingSupply: supply ? `$${(supply / 1_000_000).toFixed(1)}M` : "—",
          fetchedAt: new Date().toISOString(),
          source: "solana_rpc_onchain",
        };
      })
    );

    return NextResponse.json({ ok: true, tokens }, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=120" },
    });

  } catch (err) {
    // Graceful degradation — return static data if RPC fails
    const fallback = ONDO_TOKENS.map((t) => ({
      ...t,
      dailyYield: (t.baseApy / 365).toFixed(4),
      circulatingSupply: "—",
      fetchedAt: new Date().toISOString(),
      source: "fallback_static",
    }));
    return NextResponse.json({ ok: true, tokens: fallback, degraded: true }, {
      headers: { "Cache-Control": "public, s-maxage=60" },
    });
  }
}