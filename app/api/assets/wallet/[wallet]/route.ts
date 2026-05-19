// FILE: app/api/assets/wallet/[wallet]/route.ts
// Returns all assets for a wallet with full intelligence data.
// Feeds the PortfolioTab when Supabase is connected.
import { NextRequest, NextResponse } from "next/server";
import { getWalletAssets }           from "@/lib/services/assetService";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { wallet: string } }
) {
  const { wallet } = params;
  if (!wallet) return NextResponse.json({ error:"wallet required" }, { status:400 });

  const assets = await getWalletAssets(wallet);

  return NextResponse.json({
    assets,
    count:  assets.length,
    wallet,
    source: "supabase",
  });
}