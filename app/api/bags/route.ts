// FILE: app/api/bags/route.ts
// Bags Index — top 10 Solana creators by 24h volume.
// Bags.fm allows creators to earn 1% on trading volume forever.
// Data source: deterministic seeded oracle (Bags API requires auth, free tier pending).
// Replace seedBagsData() with real Bags API call when key is available.
// 10-minute cache.

import { NextResponse } from "next/server";

export interface BagsToken {
  rank:       number;
  creator:    string;
  symbol:     string;
  volume24h:  number;   // USD
  price:      number;   // USD
  change24h:  number;   // %
  holders:    number;
  yield1pct:  number;   // estimated USD yield from 1% volume share
  signal:     "accumulate" | "hold" | "exit";
  momentum:   number;   // 0–100
}

const CREATORS = [
  { creator: "Ansem",       symbol: "ANSEM" },
  { creator: "Murad",       symbol: "MURAD" },
  { creator: "Toly",        symbol: "TOLY"  },
  { creator: "Cobie",       symbol: "COBIE" },
  { creator: "Hsaka",       symbol: "HSAKA" },
  { creator: "Kaito",       symbol: "KAITO" },
  { creator: "DegenSpartan",symbol: "DEGEN" },
  { creator: "0xMert",      symbol: "MERT"  },
  { creator: "Jordi",       symbol: "JORDI" },
  { creator: "Aeyakovenko", symbol: "AEY"   },
];

function seedVal(base: number, seed: number, range: number): number {
  const w = Math.floor(Date.now() / 600_000); // 10-min window
  const x = Math.abs(Math.sin(w * seed * 9301 + 49297)) % 1;
  return Math.round((base + (x - 0.5) * range) * 100) / 100;
}

function signal(change: number, momentum: number): BagsToken["signal"] {
  if (change < -5 || momentum < 30) return "exit";
  if (change > 5  && momentum > 70) return "accumulate";
  return "hold";
}

export async function GET() {
  const tokens: BagsToken[] = CREATORS.map((c, i) => {
    const seed      = i * 1.7 + 2.3;
    const vol24h    = seedVal(80_000 + i * 12_000, seed, 30_000);
    const price     = seedVal(0.08 + i * 0.012, seed + 1, 0.04);
    const change24h = Math.round((Math.sin(seed * Date.now() / 86_400_000) * 14) * 10) / 10;
    const holders   = Math.round(seedVal(1200 + i * 180, seed + 2, 400));
    const momentum  = Math.round(seedVal(55, seed + 3, 40));
    return {
      rank:      i + 1,
      creator:   c.creator,
      symbol:    c.symbol,
      volume24h: vol24h,
      price,
      change24h,
      holders,
      yield1pct: Math.round(vol24h * 0.01 * 100) / 100,
      signal:    signal(change24h, momentum),
      momentum,
    };
  }).sort((a, b) => b.volume24h - a.volume24h)
    .map((t, i) => ({ ...t, rank: i + 1 }));

  const totalVolume  = tokens.reduce((s, t) => s + t.volume24h, 0);
  const totalYield1d = tokens.reduce((s, t) => s + t.yield1pct, 0);

  return NextResponse.json({
    ok: true, tokens, totalVolume, totalYield1d,
    updatedAt: new Date().toISOString(),
    source: "deterministic_oracle",
    note: "Replace with live Bags.fm API when auth key available",
  }, {
    headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=120" },
  });
}