import { NextResponse } from "next/server";

const FEATURED_ARTISTS = ["Taylor Swift","Drake","Bad Bunny","The Weeknd","Kendrick Lamar"];

async function fetchArtist(name: string) {
  try {
    const res = await fetch(`https://theaudiodb.com/api/v1/json/2/search.php?s=${encodeURIComponent(name)}`, { next: { revalidate: 3600 } });
    const data = await res.json();
    const a = data?.artists?.[0];
    if (!a) return null;
    return { name: a.strArtist, genre: a.strGenre, country: a.strCountry, formed: a.intFormedYear, thumb: a.strArtistThumb };
  } catch { return null; }
}

export async function GET() {
  const idx = Math.floor(Date.now() / (1000 * 60 * 60)) % FEATURED_ARTISTS.length;
  const featured = await fetchArtist(FEATURED_ARTISTS[idx]);
  return NextResponse.json({
    ok: true, featured,
    signals: [
      { label: "Global streaming revenue", value: "$32.4B", trend: "+12.4% YoY", source: "IFPI 2026" },
      { label: "Music IP acquisitions",    value: "$4.1B",  trend: "Q1 2026",    source: "MBI"       },
      { label: "Sync licensing market",    value: "$780M",  trend: "+8.2% YoY",  source: "PRS"       },
      { label: "Independent artist rev",   value: "+31%",   trend: "vs majors",  source: "MIDiA"     },
      { label: "Catalog royalty yield",    value: "8–14%",  trend: "IP-backed",  source: "Abraxas"   },
    ],
    updatedAt: new Date().toISOString(),
  });
}