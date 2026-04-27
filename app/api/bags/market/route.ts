import { NextResponse } from "next/server";
import { fetchMarketData, bagsConfigStatus } from "@/lib/bags";

/**
 * GET /api/bags/market
 * Returns partner-level stats (claimed + unclaimed fees).
 * Used for the homepage trust strip.
 */
export async function GET() {
  try {
    const market = await fetchMarketData();
    return NextResponse.json({
      ok: true,
      market,
      config: bagsConfigStatus(),
    });
  } catch (err) {
    console.error("[api/bags/market] error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch market data" },
      { status: 500 }
    );
  }
}
