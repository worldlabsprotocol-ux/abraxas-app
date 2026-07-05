import { NextRequest, NextResponse } from "next/server";
import { buildRampSession } from "@/lib/payments/ramp";

export const dynamic = "force-dynamic";

/** POST /api/payments/ramp-session — create fiat on-ramp session for booking */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      sui_address?: string;
      amount_usd?: number;
      booking_id?: string;
      memo?: string;
    };

    const suiAddress = body.sui_address?.trim();
    if (!suiAddress) {
      return NextResponse.json({ ok: false, error: "sui_address required" }, { status: 400 });
    }

    const amountUsd = typeof body.amount_usd === "number" ? body.amount_usd : 0;
    const session = buildRampSession({
      suiAddress,
      amountUsd,
      bookingId: body.booking_id,
      memo: body.memo,
    });

    return NextResponse.json({ ok: true, ...session });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
}
