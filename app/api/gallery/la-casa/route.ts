// FILE: app/api/gallery/la-casa/route.ts
// Real OpenSea v2 API integration. Needs OPENSEA_API_KEY in Vercel env
// vars (free, request one at https://docs.opensea.io/reference/api-keys).
// Without a key OpenSea returns a 401, this surfaces that honestly
// instead of faking data.
import { NextResponse } from "next/server";

const SLUG = "la-casa-distortion";

export async function GET() {
  const apiKey = process.env.OPENSEA_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENSEA_API_KEY not set, request one free at docs.opensea.io/reference/api-keys" },
      { status: 500 }
    );
  }

  try {
    const [statsRes, nftsRes] = await Promise.all([
      fetch(`https://api.opensea.io/api/v2/collections/${SLUG}/stats`, {
        headers: { "x-api-key": apiKey },
      }),
      fetch(`https://api.opensea.io/api/v2/collection/${SLUG}/nfts?limit=50`, {
        headers: { "x-api-key": apiKey },
      }),
    ]);

    if (!statsRes.ok || !nftsRes.ok) {
      const errText = await (statsRes.ok ? nftsRes : statsRes).text();
      return NextResponse.json({ error: `OpenSea API error: ${errText}` }, { status: 502 });
    }

    const stats = await statsRes.json();
    const nftsData = await nftsRes.json();

    return NextResponse.json({
      stats: {
        floorPrice: stats?.total?.floor_price ?? null,
        volume: stats?.total?.volume ?? null,
        owners: stats?.total?.num_owners ?? null,
        supply: stats?.total?.supply ?? null,
      },
      nfts: (nftsData?.nfts ?? []).map((n: { identifier: string; name: string; image_url: string; opensea_url: string }) => ({
        id: n.identifier,
        name: n.name,
        image: n.image_url,
        url: n.opensea_url,
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
