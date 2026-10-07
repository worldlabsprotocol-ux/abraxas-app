import { NextRequest, NextResponse } from "next/server";
import { buildPassJson, isWalletPassConfigured } from "@/lib/walletPass/config";

export const dynamic = "force-dynamic";

/**
 * PassKit web service — GET updated pass by serial number.
 * Apple calls: GET /v1/passes/{passTypeIdentifier}/{serialNumber}
 * Mounted at: /api/apple-wallet/v1/passes/[passTypeId]/[serialNumber]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{  passTypeId: string; serialNumber: string  }> },
) {
  const routeParams = await params;
  const auth = req.headers.get("authorization")?.replace(/^ApplePass /i, "");
  if (auth && auth !== routeParams.serialNumber) {
    return new NextResponse(null, { status: 401 });
  }

  if (!isWalletPassConfigured()) {
    return NextResponse.json({
      ok: false,
      message: "Pass signing not configured. Returns JSON preview until passkit-generator is wired.",
      passPreview: buildPassJson({
        suiAddress: "0x0",
        credentialId: routeParams.serialNumber,
      }),
    }, { status: 503 });
  }

  // Production: sign and return application/vnd.apple.pkpass
  return NextResponse.json({
    ok: true,
    configured: true,
    serialNumber: routeParams.serialNumber,
    passTypeIdentifier: routeParams.passTypeId,
    message: "Pass update endpoint ready — wire passkit-generator to emit signed .pkpass bytes.",
    passPreview: buildPassJson({
      suiAddress: "0x0",
      credentialId: routeParams.serialNumber,
    }),
  });
}
