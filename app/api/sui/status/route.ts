// FILE: app/api/sui/status/route.ts
// Public Sui deployment status — honest network + mainnet readiness for integrators.

import { NextResponse } from "next/server";
import { getSuiDeployment, isSuiMainnetDeployed } from "@/lib/sui/config";
import { getPublicSuiConfig } from "@/lib/sui/network";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = getPublicSuiConfig();
  const deployment = getSuiDeployment();
  const issuerConfigured = Boolean(
    process.env.SUI_SPONSOR_SECRET_KEY && process.env.SUI_ISSUANCE_CAP_OBJECT_ID,
  );

  return NextResponse.json({
    ...config,
    deployment: {
      network: deployment.network,
      package_id: deployment.packageId || null,
      module: deployment.module,
      explorer_base: deployment.explorerBase,
      published_at: deployment.publishedAt,
    },
    mainnet_deployed: isSuiMainnetDeployed(),
    issuer_configured: issuerConfigured,
    passport_type: deployment.packageId
      ? `${deployment.packageId}::${deployment.module}::Passport`
      : null,
    updated_at: new Date().toISOString(),
  });
}
