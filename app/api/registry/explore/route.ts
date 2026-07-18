// FILE: app/api/registry/explore/route.ts
// Merge static explore catalog with external asset applications when DB available.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { EXPLORE_ASSETS, type ExploreAsset } from "@/lib/data/exploreAssets";

export const dynamic = "force-dynamic";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export async function GET() {
  const assets: ExploreAsset[] = [...EXPLORE_ASSETS];

  if (SB_URL && SB_KEY) {
    const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
    const { data } = await sb
      .from("external_asset_applications")
      .select("id, asset_name, asset_class, location, status, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(20);

    for (const row of data ?? []) {
      assets.push({
        id: `external-${row.id}`,
        name: row.asset_name as string,
        assetClass: (row.asset_class as string) ?? "External asset",
        location: (row.location as string) ?? "—",
        image: "/assets/worldwearables/naj.jpg",
        primaryLabel: "Status",
        primaryValue: "Partner listed",
        secondaryLabel: "Listed",
        secondaryValue: new Date(row.created_at as string).toLocaleDateString(),
        state: "listed",
        href: "/integrations/external-assets",
        cta: "View intake →",
        note: "External owner asset on Abraxas registry.",
      });
    }
  }

  return NextResponse.json({
    assets,
    count: assets.length,
    updated_at: new Date().toISOString(),
  });
}
