import { NextResponse } from "next/server";
import { getFiatOnRampProvider, isFiatOnRampConfigured } from "@/lib/payments/provider";

export const dynamic = "force-dynamic";

/** GET /api/payments/provider — which fiat on-ramp is active */
export async function GET() {
  return NextResponse.json({
    ok: true,
    provider: getFiatOnRampProvider(),
    configured: isFiatOnRampConfigured(),
  });
}
