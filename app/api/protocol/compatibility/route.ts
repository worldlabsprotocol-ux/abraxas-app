// FILE: app/api/protocol/compatibility/route.ts
// Public machine-readable Partner Flow compatibility manifest (generated from code).

import { NextResponse } from "next/server";
import { buildPartnerFlowCompatibilityManifest } from "@/lib/protocol/partnerFlowCompatibilityManifest";
import { getSdkDefaultBaseUrl } from "@/lib/app/publicAppOrigin";

export const dynamic = "force-dynamic";

export async function GET() {
  const origin = getSdkDefaultBaseUrl();
  const manifest = buildPartnerFlowCompatibilityManifest(origin);
  return NextResponse.json(manifest, {
    headers: {
      "Cache-Control": "public, max-age=300",
      "X-Abraxas-Compatibility-Version": manifest.compatibility_version,
    },
  });
}
