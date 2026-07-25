// FILE: app/api/idv/independent/status/route.ts
// Health + config for Abraxas independent biometric IDV (non-Veriff).

import { NextResponse } from "next/server";
import { getIdvProvider, idvProviderLabel, isAbraxasIndependentIdv } from "@/lib/idv/idvProvider";
import { isPassportIssuerConfigured, getSponsorConfig } from "@/lib/sui/passportIssuer";
import { getActiveSuiNetwork, isSuiMainnetDeployed, resolveSuiDeployment } from "@/lib/sui/config";

export async function GET() {
  const provider = getIdvProvider();
  const resolved = resolveSuiDeployment();
  const sponsor = getSponsorConfig();

  return NextResponse.json({
    idv_provider: provider,
    abraxas_independent: isAbraxasIndependentIdv(),
    label: idvProviderLabel(provider),
    capture_flow: "name + id_front + selfie",
    review_queue: "/admin/identity",
    signing_key_configured: Boolean(process.env.ABRAXAS_SIGNING_KEY),
    sui_network: getActiveSuiNetwork(),
    sui_package_deployed: Boolean(resolved.deployment.packageId?.startsWith("0x")),
    sui_mainnet_deployed: isSuiMainnetDeployed(),
    mainnet_package_missing: resolved.mainnetPackageMissing,
    on_chain_issuer_configured: isPassportIssuerConfigured(),
    sponsor_configured: sponsor.configured,
    issuance_cap_from_env: sponsor.cap_from_env,
  });
}
