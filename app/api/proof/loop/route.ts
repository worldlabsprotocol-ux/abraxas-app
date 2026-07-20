// FILE: app/api/proof/loop/route.ts
// Public authentication proof loop status — what is live vs pending Move redeploy.

import { NextResponse } from "next/server";
import { AUTHENTICATION_PROOF_LOOP_STATUS } from "@/lib/authenticationProof/loopStatus";
import { getVerificationLayerStatus } from "@/lib/authenticationProof/verificationLayerStatus";
import { loadReceiptSigningKey } from "@/lib/decisionReceipts/signing";
import { isPassportIssuerConfigured } from "@/lib/sui/passportIssuer";
import { getActiveSuiNetwork } from "@/lib/sui/config";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ...AUTHENTICATION_PROOF_LOOP_STATUS,
    runtime: {
      signing_configured: Boolean(loadReceiptSigningKey()),
      sui_network: getActiveSuiNetwork(),
      sui_issuer_configured: isPassportIssuerConfigured(),
      on_chain_anchor_enabled: process.env.ON_CHAIN_ANCHOR_ENABLED !== "false",
    },
    endpoints: {
      verify: "POST /api/credentials/verify",
      proof_lookup: "GET /api/proof/[id]",
      production_reference: "GET /api/proof/reference/ABX-RE-HOSP-001",
      asset_monitoring_preview: "GET /api/asset-monitoring/preview?asset_id=ABX-RE-LAND-006",
    },
  });
}
