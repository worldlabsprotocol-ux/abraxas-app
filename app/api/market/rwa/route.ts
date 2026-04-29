import { NextResponse } from "next/server";

async function fetchRWATokens() {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=real-world-assets-rwa&order=market_cap_desc&per_page=5&page=1", { next: { revalidate: 300 } });
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((t: { symbol: string; name: string; current_price: number; market_cap: number; price_change_percentage_24h: number }) => ({
      symbol: t.symbol?.toUpperCase(), name: t.name, price: t.current_price,
      marketCap: t.market_cap, change24h: t.price_change_percentage_24h,
    }));
  } catch { return []; }
}

export async function GET() {
  const rwaTokens = await fetchRWATokens();
  return NextResponse.json({
    ok: true, rwaTokens,
    marketSignals: [
      { label: "Total RWA on-chain",      value: "$33.2B", trend: "+340% YoY",   source: "rwa.xyz 2026"   },
      { label: "US home price index",     value: "+5.2%",  trend: "HPI Q1 2026", source: "FHFA"           },
      { label: "Commercial RE vacancy",   value: "18.6%",  trend: "Office avg",  source: "CBRE Q1 2026"   },
      { label: "Invoice factoring mkt",   value: "$4.8T",  trend: "Global 2026", source: "Statista"       },
      { label: "Tokenized Treasuries",    value: "$2.75B", trend: "+90% 6mo",    source: "Ondo/BUIDL/RWA" },
    ],
    updatedAt: new Date().toISOString(),
  });
}