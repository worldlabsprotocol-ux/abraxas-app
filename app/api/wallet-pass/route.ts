import { NextRequest, NextResponse } from "next/server";
import { buildPassJson, isWalletPassConfigured } from "@/lib/walletPass/config";

export const dynamic = "force-dynamic";

/** GET /api/wallet-pass?sui=0x… — Apple Wallet .pkpass scaffold */
export async function GET(req: NextRequest) {
  const sui = req.nextUrl.searchParams.get("sui");
  if (!sui) {
    return NextResponse.json({ ok: false, error: "Missing sui address" }, { status: 400 });
  }

  const level = req.nextUrl.searchParams.get("level") ?? undefined;
  const asset = req.nextUrl.searchParams.get("asset") ?? undefined;
  const credentialId = req.nextUrl.searchParams.get("credentialId") ?? undefined;

  const passJson = buildPassJson({
    suiAddress: sui,
    verificationLevel: level,
    assetName: asset,
    credentialId,
  });

  if (!isWalletPassConfigured()) {
    return NextResponse.json({
      ok: false,
      configured: false,
      passPreview: passJson,
      setup: [
        "Register Pass Type ID in Apple Developer",
        "Set APPLE_PASS_TYPE_ID, APPLE_TEAM_ID, APPLE_PASS_CERT_PEM, APPLE_PASS_KEY_PEM",
        "Install passkit-generator and sign pass.json + assets into .pkpass",
      ],
      message: "Apple Wallet pass signing is not configured in this environment.",
    }, { status: 503 });
  }

  // Production path: sign with passkit-generator when certs are present.
  // Scaffold returns preview until signing pipeline is wired.
  return NextResponse.json({
    ok: true,
    configured: true,
    passPreview: passJson,
    message: "Pass signing pipeline ready — wire passkit-generator to emit application/vnd.apple.pkpass",
  });
}
