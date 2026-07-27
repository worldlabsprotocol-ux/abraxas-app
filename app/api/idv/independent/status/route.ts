// FILE: app/api/idv/independent/status/route.ts
// Health + config for Abraxas independent biometric IDV (non-Veriff).

import { NextResponse } from "next/server";
import { getIndependentIdvStatus } from "@/lib/idv/independentIdvStatus";
import { getSponsorConfig } from "@/lib/sui/passportIssuer";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await getIndependentIdvStatus();
  const sponsor = getSponsorConfig();

  return NextResponse.json({
    ...status,
    sponsor_configured: sponsor.configured,
    issuance_cap_from_env: sponsor.cap_from_env,
    endpoints: {
      capture: "POST /api/identity/documents/capture",
      biometric_engine: "/api/idv/biometric/status",
      admin_review: "/admin/identity",
      identity_status: "GET /api/identity/status",
      verification_layer: "GET /api/verify/layer",
    },
  });
}
