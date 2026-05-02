// FILE: app/api/nft/collections/route.ts
// Reservoir NFT collections proxy.
//
// DESIGN RULES:
// - Works WITHOUT API key (public Reservoir endpoint, unauthenticated)
// - Enhances WITH key (higher rate limits, more data)
// - Never blocks rendering due to missing key
// - Server-side only — no secrets exposed to client
// - 60s edge cache — prevents rate-limit collapse
//
// Architecture:
//   Client hook → GET /api/nft/collections?chain=ethereum&limit=20
//                → Reservoir /collections/v7 (server-side, cached)
//                → NormalizedCollection[] → Client

import { NextRequest, NextResponse } from "next/server";
import type { NormalizedCollection, NFTFeedResponse } from "@/lib/types/nft";

// Reservoir base URLs per chain
const CHAIN_HOSTS: Record<string, string> = {
  ethereum: "https://api.reservoir.tools",
  polygon:  "https://api-polygon.reservoir.tools",
  base:     "https://api-base.reservoir.tools",
  // Solana is NOT served by Reservoir in the same way — kept isolated per spec
};

// Normalize Reservoir collection → our type
function normalize(raw: Record<string, unknown>, chain: string): NormalizedCollection {
  const floorAsk = raw.floorAsk as Record<string, unknown> | undefined;
  const price    = floorAsk?.price as Record<string, unknown> | undefined;
  const amount   = price?.amount as Record<string, unknown> | undefined;
  const volume   = raw.volume as Record<string, number> | undefined;
  const change   = raw.volumeChange as Record<string, number> | undefined;

  const vol24h   = volume?.["1day"] ?? null;
  const chg24h   = change?.["1day"] ?? null;

  return {
    id:          String(raw.id ?? ""),
    name:        String(raw.name ?? "Unknown"),
    image:       typeof raw.image === "string" ? raw.image : null,
    floorPrice:  typeof amount?.native === "number" ? amount.native : null,
    floorSymbol: chain === "polygon" ? "MATIC" : "ETH",
    volume24h:   typeof vol24h === "number" ? vol24h : null,
    change24h:   typeof chg24h === "number" ? chg24h : null,
    positive:    (chg24h ?? 0) >= 0,
    chain,
    marketUrl:   typeof raw.externalUrl === "string" ? raw.externalUrl : null,
    source:      "reservoir_live",
    fetchedAt:   new Date().toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const chain  = searchParams.get("chain") ?? "ethereum";
  const limit  = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);
  const apiKey = process.env.RESERVOIR_API_KEY ?? "";  // optional

  const host = CHAIN_HOSTS[chain] ?? CHAIN_HOSTS.ethereum;
  const url  = `${host}/collections/v7?limit=${limit}&sortBy=24DayVolume&normalizeRoyalties=false`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  // Only set x-api-key if we have one — public endpoint works without it
  if (apiKey) headers["x-api-key"] = apiKey;

  try {
    const upstream = await fetch(url, {
      headers,
      // Next.js fetch cache: 60s at the edge
      next: { revalidate: 60 },
    });

    if (!upstream.ok) {
      const body = await upstream.text().catch(() => "");
      console.error(`[nft/collections] Reservoir ${upstream.status}: ${body.slice(0, 200)}`);
      return NextResponse.json(
        {
          ok: false, collections: [], chain, source: "reservoir_error",
          error: `Reservoir returned ${upstream.status}`, fetchedAt: new Date().toISOString(),
        } satisfies NFTFeedResponse,
        { status: 200 } // 200 so client degrades gracefully, not crash
      );
    }

    const data = await upstream.json();
    const raw: Record<string, unknown>[] = data?.collections ?? [];
    const collections = raw.map((c) => normalize(c, chain));

    const response: NFTFeedResponse = {
      ok: true, collections, chain,
      source: apiKey ? "reservoir_authenticated" : "reservoir_public",
      fetchedAt: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      headers: {
        // Edge + browser cache: 60s fresh, serve stale up to 120s while revalidating
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (err) {
    console.error("[nft/collections] fetch error:", err);
    return NextResponse.json(
      {
        ok: false, collections: [], chain, source: "network_error",
        error: err instanceof Error ? err.message : "Network error",
        fetchedAt: new Date().toISOString(),
      } satisfies NFTFeedResponse,
      { status: 200 } // client gets 200 so it can show error state, not crash
    );
  }
}