import { NextRequest, NextResponse } from "next/server";
import {
  createMoonPaySession,
  isMoonPayTestMode,
  resolveMoonPayQuoteAsset,
  resolveMoonPayQuoteWallet,
} from "@/lib/payments/moonpay";

export const dynamic = "force-dynamic";

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1"
  );
}

/** POST /api/payments/moonpay-session — MoonPay Platform session for headless Apple Pay */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      sui_address?: string;
      booking_id?: string;
      email?: string;
      phone_number?: string;
      terms_accepted_at?: string;
    };

    const suiAddress = body.sui_address?.trim();
    if (!suiAddress) {
      return NextResponse.json({ ok: false, error: "sui_address required" }, { status: 400 });
    }

    const externalCustomerId = body.booking_id?.trim() || suiAddress;
    const testMode = isMoonPayTestMode();

    const session = await createMoonPaySession({
      externalCustomerId,
      deviceIp: clientIp(req),
      email: body.email?.trim(),
      phoneNumber: body.phone_number?.trim(),
      termsAcceptedAt: body.terms_accepted_at,
    });

    return NextResponse.json({
      ok: true,
      provider: "moonpay",
      ...session,
      quoteWalletAddress: resolveMoonPayQuoteWallet(suiAddress, testMode),
      destinationAssetCode: resolveMoonPayQuoteAsset(testMode),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
}
