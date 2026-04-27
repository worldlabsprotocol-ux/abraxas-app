import { NextResponse } from "next/server";
import { fetchAssets } from "@/lib/bags";

/**
 * GET /api/bags/assets
 * Returns the Bags token launch feed.
 * Public endpoint — Bags key stays server-side.
 */
export async function GET() {
  try {
    const assets = await fetchAssets();
    return NextResponse.json({ ok: true, assets });
  } catch (err) {
    console.error("[api/bags/assets] error:", err);
    return NextResponse.json(
      { ok: false, assets: [], error: "Failed to fetch assets" },
      { status: 500 }
    );
  }
}
