// FILE: app/api/assets/[id]/timeline/route.ts
// Returns the full immutable event timeline for an asset.
// Public read — anyone can audit the verification history.
import { NextRequest, NextResponse } from "next/server";
import { getAssetTimeline }          from "@/lib/services/assetService";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const events = await getAssetTimeline(params.id);
  return NextResponse.json({
    events,
    count:   events.length,
    assetId: params.id,
  }, {
    headers: { "Access-Control-Allow-Origin":"*" },
  });
}