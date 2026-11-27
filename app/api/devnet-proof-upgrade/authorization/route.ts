import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const reference = process.env.ABRAXAS_DEVNET_PROOF_UPGRADE_APPROVAL_REFERENCE || "";
  const enabled = process.env.VERCEL_ENV === "preview" &&
    process.env.ABRAXAS_DEVNET_PROOF_UPGRADE_ENABLED === "true" &&
    process.env.ABRAXAS_DEVNET_PROOF_UPGRADE_MAX_LAMPORTS === "2500000000" &&
    /^https:\/\/github\.com\/worldlabsprotocol-ux\/abraxas-app\/pull\/1003#issuecomment-\d+$/.test(reference);
  return NextResponse.json({ enabled, maxLamports: enabled ? 2_500_000_000 : 0,
    approvalReference: enabled ? reference : null }, { headers: { "Cache-Control": "no-store" } });
}
