// FILE: app/api/market/intel/route.ts
// Curated market intelligence feed: headlines from credible RSS sources.
// Focus: stablecoins, RWA, BTC, tokenization. Not static price tiles.

import { NextResponse } from "next/server";

export const revalidate = 300;

interface FeedItem {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  topic: "stablecoin" | "rwa" | "btc" | "macro" | "sui";
}

const RSS_SOURCES = [
  { name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
  { name: "The Block", url: "https://www.theblock.co/rss.xml" },
  { name: "Decrypt", url: "https://decrypt.co/feed" },
];

const TOPIC_KEYWORDS: Record<FeedItem["topic"], string[]> = {
  stablecoin: ["stablecoin", "usdt", "usdc", "tether", "circle", "dai", "usd"],
  rwa: ["rwa", "real-world", "tokenized", "treasury", "ondo", "blackrock", "buidl", "real estate", "commodit"],
  btc: ["bitcoin", "btc", "halving", "etf"],
  macro: ["fed", "rates", "inflation", "regulation", "sec", "cftc", "policy"],
  sui: ["sui", "move", "zklogin"],
};

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();
}

function classifyTopic(text: string): FeedItem["topic"] {
  const lower = text.toLowerCase();
  for (const [topic, words] of Object.entries(TOPIC_KEYWORDS) as [FeedItem["topic"], string[]][]) {
    if (words.some(w => lower.includes(w))) return topic;
  }
  return "macro";
}

function parseRssItems(xml: string, source: string, limit: number): FeedItem[] {
  const items: FeedItem[] = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];

  for (const block of blocks.slice(0, limit)) {
    const title = stripHtml(block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
    const link = stripHtml(block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] ?? "")
      || block.match(/<link[^>]+href="([^"]+)"/i)?.[1]
      || "";
    const pub = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim()
      ?? block.match(/<published[^>]*>([\s\S]*?)<\/published>/i)?.[1]?.trim()
      ?? new Date().toISOString();

    if (!title || !link) continue;

    items.push({
      id: `${source}-${Buffer.from(link).toString("base64url").slice(0, 16)}`,
      title,
      source,
      url: link,
      publishedAt: pub,
      topic: classifyTopic(title),
    });
  }

  return items;
}

const FALLBACK: FeedItem[] = [
  {
    id: "fallback-1",
    title: "Tokenized treasuries cross $3B as institutions seek on-chain yield",
    source: "RWA.xyz",
    url: "https://rwa.xyz/",
    publishedAt: new Date().toISOString(),
    topic: "rwa",
  },
  {
    id: "fallback-2",
    title: "Stablecoin supply on major chains continues to absorb liquidity",
    source: "DeFiLlama",
    url: "https://stablecoins.llama.fi/",
    publishedAt: new Date().toISOString(),
    topic: "stablecoin",
  },
  {
    id: "fallback-3",
    title: "Bitcoin ETF flows remain a leading indicator for risk appetite",
    source: "CoinDesk",
    url: "https://www.coindesk.com/",
    publishedAt: new Date().toISOString(),
    topic: "btc",
  },
  {
    id: "fallback-4",
    title: "Sui zkLogin adoption grows as apps reduce wallet friction",
    source: "Sui Foundation",
    url: "https://sui.io/",
    publishedAt: new Date().toISOString(),
    topic: "sui",
  },
];

export async function GET() {
  try {
    const results = await Promise.allSettled(
      RSS_SOURCES.map(async src => {
        const res = await fetch(src.url, {
          next: { revalidate: 300 },
          headers: { Accept: "application/rss+xml, application/xml, text/xml" },
        });
        if (!res.ok) return [] as FeedItem[];
        const xml = await res.text();
        return parseRssItems(xml, src.name, 12);
      }),
    );

    let items = results
      .flatMap(r => (r.status === "fulfilled" ? r.value : []))
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    const preferred = items.filter(i =>
      i.topic === "stablecoin" || i.topic === "rwa" || i.topic === "btc" || i.topic === "sui",
    );
    items = preferred.length >= 6 ? preferred : items;

    if (items.length < 4) {
      items = [...items, ...FALLBACK].slice(0, 12);
    } else {
      items = items.slice(0, 12);
    }

    return NextResponse.json({
      ok: true,
      items,
      updatedAt: new Date().toISOString(),
      source: items.some(i => !i.id.startsWith("fallback")) ? "rss_live" : "curated_fallback",
    }, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=120" },
    });
  } catch (err) {
    return NextResponse.json({
      ok: true,
      items: FALLBACK,
      updatedAt: new Date().toISOString(),
      source: "curated_fallback",
      error: err instanceof Error ? err.message : "Failed",
    });
  }
}
