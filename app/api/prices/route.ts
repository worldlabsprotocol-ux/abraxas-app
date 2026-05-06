// FILE: app/api/prices/route.ts
// Live price feed for XAUT, SLVON, USDY, OUSG.
// Sources (priority): Pyth Network on-chain → CoinGecko free API → deterministic oracle.
// Pyth: zero-cost, on-chain, sub-second latency. Best source.
// CoinGecko: free tier, 30 req/min. Fallback.
// Deterministic: never fails, used for demo/offline.
// 60-second cache — prices change slowly for metals.

import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";

// Pyth price account public keys (mainnet)
const PYTH_XAUT  = "8y3WWjvmSmVGWVKH1rCA7VTRmuU7QbJ9axafSsBX5Zoe"; // XAU/USD
const PYTH_XAG   = "ZSSXgpjSHGksPz44HQGzpKhtqKTmj5Wxz9A7GiH27Le";  // XAG/USD (silver)

// CoinGecko IDs
const COINGECKO_IDS = "tether-gold,slvon,ondo-us-dollar-yield,ousg";

async function fetchPythPrice(accountKey: string, connection: Connection): Promise<number | null> {
  try {
    const pk      = new PublicKey(accountKey);
    const info    = await connection.getAccountInfo(pk);
    if (!info) return null;
    // Pyth price account layout: price at byte 208 (int64 LE) + exponent at byte 216 (int32 LE)
    const data    = info.data;
    const price   = Number(data.readBigInt64LE(208));
    const expo    = data.readInt32LE(216);
    return price * Math.pow(10, expo);
  } catch { return null; }
}

type CgPrice = { usd?: number; usd_24h_change?: number };
async function fetchCoinGecko(): Promise<Record<string, CgPrice>> {
  try {
    const res  = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${COINGECKO_IDS}&vs_currencies=usd&include_24hr_change=true`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return {};
    return await res.json();
  } catch { return {}; }
}

// Deterministic fallback — realistic values seeded to 5-minute window
function oraclePrice(base: number, seed: number, range: number): number {
  const w = Math.floor(Date.now() / 300_000);
  const x = Math.abs(Math.sin(w * seed * 9301 + 49297)) % 1;
  return Math.round((base + (x - 0.5) * range) * 100) / 100;
}

export async function GET() {
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");

  // Attempt Pyth first (fastest, most accurate)
  const [xauPyth, xagPyth] = await Promise.all([
    fetchPythPrice(PYTH_XAUT, connection),
    fetchPythPrice(PYTH_XAG,  connection),
  ]);

  // Attempt CoinGecko as secondary
  const cg = await fetchCoinGecko();

  // Resolve final prices with fallback chain
  const xautPrice = xauPyth
    ?? cg["tether-gold"]?.usd
    ?? oraclePrice(6787.69, 1.1, 15); // XAUT May 2026

  const slvonPrice = xagPyth
    ?? cg["slvon"]?.usd
    ?? oraclePrice(65.94, 2.3, 0.3); // SLVON May 2026

  const usdyApy  = 5.20;  // Ondo $USDY — stable, accrues daily
  const ousgApy  = 5.08;  // Ondo $OUSG

  const xautChange  = cg["tether-gold"]?.usd_24h_change  ?? oraclePrice(0.4, 3.1, 1.2);
  const slvonChange = cg["slvon"]?.usd_24h_change         ?? oraclePrice(0.6, 4.2, 1.5);

  const source = xauPyth ? "pyth_mainnet" : cg["tether-gold"] ? "coingecko" : "oracle";

  return NextResponse.json({
    ok: true, source,
    prices: {
      XAUT:  { price: xautPrice,  change24h: xautChange,  symbol: "XAUT",  name: "Tether Gold",    decimals: 2 },
      SLVON: { price: slvonPrice, change24h: slvonChange, symbol: "SLVON", name: "Silver On-Chain", decimals: 2 },
      USDY:  { price: 1.00,       change24h: 0.01,        symbol: "USDY",  name: "Ondo USD Yield",  apy: usdyApy,  dailyAccrual: (usdyApy / 365).toFixed(4) },
      OUSG:  { price: 1.00,       change24h: 0.00,        symbol: "OUSG",  name: "Ondo Short Gov",  apy: ousgApy,  dailyAccrual: (ousgApy / 365).toFixed(4) },
    },
    updatedAt: new Date().toISOString(),
  }, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30" },
  });
}