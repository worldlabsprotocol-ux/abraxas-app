import { NextRequest, NextResponse } from "next/server";
import { fetchTokenData } from "@/lib/bags";

/**
 * GET /api/bags/token?mint=<tokenMint>
 * Returns pool + creators + lifetime fees for one token.
 */
export async function GET(req: NextRequest) {
  const mint = req.nextUrl.searchParams.get("mint");
  if (!mint) {
    return NextResponse.json(
      { ok: false, error: "mint param required" },
      { status: 400 }
    );
  }
  try {
    const data = await fetchTokenData(mint);
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    console.error("[api/bags/token] error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch token data" },
      { status: 500 }
    );
  }
}
