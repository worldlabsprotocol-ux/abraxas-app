// FILE: app/api/sui/mainnet/readiness/route.ts
// Sui mainnet deploy path — gates #2 audit + #3 publish checklist.

import { NextResponse } from "next/server";
import { getSuiMainnetDeployPath } from "@/lib/sui/mainnetDeployPath";
import { isSuiMainnetDeployed, resolveSuiDeployment } from "@/lib/sui/config";
import { getPublicSuiConfig } from "@/lib/sui/network";

export const dynamic = "force-dynamic";

export async function GET() {
  const path = getSuiMainnetDeployPath();
  const resolved = resolveSuiDeployment();
  const network = getPublicSuiConfig();

  return NextResponse.json({
    ...path,
    network,
    deployment: {
      source: resolved.source,
      package_id: resolved.deployment.packageId || null,
      mainnet_package_missing: resolved.mainnetPackageMissing,
      published_at: resolved.deployment.publishedAt,
      publish_tx: resolved.deployment.publishTxDigest,
      explorer_base: resolved.deployment.explorerBase,
    },
    mainnet_gate_3_live: isSuiMainnetDeployed(),
    endpoints: {
      sui_status: "/api/sui/status",
      mainnet_readiness: "/api/mainnet/readiness",
      passport_sponsor: "/api/sui/passport/sponsor",
    },
    updated_at: new Date().toISOString(),
  });
}
