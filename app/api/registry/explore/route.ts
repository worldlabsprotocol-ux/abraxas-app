// FILE: app/api/registry/explore/route.ts
// Merged static catalog + owner self-serve listings for the Assets Explorer.

import { NextResponse } from "next/server";
import { fetchExploreAssetsMerged } from "@/lib/portal/externalRegistry";

export const dynamic = "force-dynamic";

/** GET /api/registry/explore — public registry cards (static + owner-listed) */
export async function GET() {
  try {
    const assets = await fetchExploreAssetsMerged();
    const ownerListed = assets.filter(a => a.state === "listed").length;
    return NextResponse.json({
      ok: true,
      assets,
      owner_listed_count: ownerListed,
      total: assets.length,
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      assets: [],
      error: e instanceof Error ? e.message : "Failed to load registry",
    }, { status: 500 });
  }
}
