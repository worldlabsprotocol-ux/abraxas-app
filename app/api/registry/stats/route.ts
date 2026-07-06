import { NextRequest, NextResponse } from "next/server";
import { getUnifiedRegistryStats } from "@/lib/registry/unifiedStats";

export const revalidate = 120;

/** GET /api/registry/stats — unified registry + protocol stats (single source of truth) */
export async function GET() {
  const stats = await getUnifiedRegistryStats();

  return NextResponse.json({
    ok: true,
    stats,
    updatedAt: new Date().toISOString(),
  }, {
    headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=60" },
  });
}
