// FILE: app/api/sui/status/route.ts
// Public Sui deployment status — honest network + mainnet readiness for integrators.

import { NextResponse } from "next/server";
import { getSuiDeployment, isSuiMainnetDeployed, resolveSuiDeployment } from "@/lib/sui/config";
import { getPublicSuiConfig } from "@/lib/sui/network";
import { getSponsorEnvDiagnostics, isPassportIssuerConfigured } from "@/lib/sui/passportIssuer";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = getPublicSuiConfig();
  const resolved = resolveSuiDeployment();
  const deployment = resolved.deployment;
  const issuerDiagnostics = getSponsorEnvDiagnostics();
  const issuerConfigured = isPassportIssuerConfigured();

  const blockers: string[] = [];
  if (resolved.mainnetPackageMissing) {
    blockers.push("SUI_NETWORK=mainnet but deployment.mainnet.json packageId is empty");
  }
  if (config.is_mainnet && !isSuiMainnetDeployed()) {
    blockers.push("Mainnet network selected but Passport package not published on mainnet");
  }
  if (issuerDiagnostics.sponsor_key_status === "invalid") {
    blockers.push("SUI_SPONSOR_SECRET_KEY is set but invalid");
  }
  if (issuerDiagnostics.env_flags.SUI_ISSUANCE_CAP_OBJECT_ID_set && !issuerDiagnostics.issuance_cap_length_ok) {
    blockers.push("SUI_ISSUANCE_CAP_OBJECT_ID malformed (expected 66-char 0x address)");
  }
  if (!issuerDiagnostics.issuer_fully_configured && config.is_mainnet) {
    blockers.push("Sponsor wallet + IssuanceCap not fully configured for mainnet provision");
  }

  return NextResponse.json({
    ...config,
    deployment: {
      network: deployment.network,
      source: resolved.source,
      package_id: deployment.packageId || null,
      mainnet_package_missing: resolved.mainnetPackageMissing,
      module: deployment.module,
      explorer_base: deployment.explorerBase,
      published_at: deployment.publishedAt,
    },
    mainnet_deployed: isSuiMainnetDeployed(),
    issuer_configured: issuerConfigured,
    issuer_fully_configured: issuerDiagnostics.issuer_fully_configured,
    sponsor_key_status: issuerDiagnostics.sponsor_key_status,
    passport_type: deployment.packageId
      ? `${deployment.packageId}::${deployment.module}::Passport`
      : null,
    blockers,
    mainnet_path: "/api/sui/mainnet/readiness",
    updated_at: new Date().toISOString(),
  });
}
