import { NextResponse } from "next/server";

const ARTISTS = ["Taylor Swift", "Drake", "Kendrick Lamar", "Bad Bunny", "Sabrina Carpenter"];

async function fetchArtist(name: string) {
  try {
    const res = await fetch(
      `https://theaudiodb.com/api/v1/json/2/search.php?s=${encodeURIComponent(name)}`,
      { next: { revalidate: 3600 } }
    );
    const data = await res.json();
    const a = data?.artists?.[0];
    if (!a) return null;
    return { name: a.strArtist, genre: a.strGenre, country: a.strCountry, thumb: a.strArtistThumb };
  } catch { return null; }
}

export async function GET() {
  const idx = Math.floor(Date.now() / (1000 * 60 * 60)) % ARTISTS.length;
  const featured = await fetchArtist(ARTISTS[idx]);

  return NextResponse.json({
    ok: true,
    featured,
    signals: [
      { label: "Global streaming revenue",  value: "$32.4B",  trend: "+12.4% YoY",  source: "IFPI 2026",     category: "music",  context: "Total annual revenue from paid streaming subscriptions worldwide" },
      { label: "Music IP catalog M&A",      value: "$4.1B",   trend: "Q1 2026",     source: "MBI",           category: "music",  context: "Institutional investors acquiring music catalogs as income-bearing assets" },
      { label: "Sync licensing market",     value: "$780M",   trend: "+8.2% YoY",   source: "PRS",           category: "sync",   context: "Revenue from licensing music for film, TV, ads, and games" },
      { label: "Independent artist rev",    value: "+31%",    trend: "vs majors",   source: "MIDiA 2026",   category: "music",  context: "Indies gaining share as direct-to-fan platforms reduce label dependency" },
      { label: "Film/TV score market",      value: "$1.2B",   trend: "+6.1% YoY",   source: "GSBS 2026",     category: "film",   context: "Composer and scorer backend royalties — a tokenizable income stream" },
      { label: "Podcast ad revenue",        value: "$4.0B",   trend: "+21% YoY",    source: "IAB 2026",      category: "audio",  context: "Host-read and programmatic podcast ad income — recurring quarterly" },
      { label: "WGA writer residuals",      value: "$890M",   trend: "2025 total",  source: "WGA Report",    category: "film",   context: "Screenwriter backend royalties from streaming — same model as music" },
      { label: "Catalog royalty yield avg", value: "8–14%",   trend: "IP-backed",   source: "Abraxas",       category: "yield",  context: "Estimated annual yield from music catalog operating income via Abraxas" },
    ],
    updatedAt: new Date().toISOString(),
  });
}