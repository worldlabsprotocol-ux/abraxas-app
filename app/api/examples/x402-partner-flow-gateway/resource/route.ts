// FILE: app/api/examples/x402-partner-flow-gateway/resource/route.ts
// TESTNET / DEMO ONLY — reference x402 + Abraxas Partner Flow gateway.
// Base Sepolia (eip155:84532) + x402 v2 headers. Not production. No Abraxas custody.

import { NextRequest, NextResponse } from "next/server";
import { tmpdir } from "os";
import { join } from "path";
import {
  decodePaymentSignatureHeader,
  FileFulfillmentStore,
  handleProtectedResourceRequest,
  HttpFacilitatorClient,
  REFERENCE_GATEWAY_ENV,
  REFERENCE_GATEWAY_LABEL,
  resolveReferenceGatewayConfig,
} from "@/lib/x402/referenceGateway";

export const dynamic = "force-dynamic";

function disabledResponse(): NextResponse {
  return NextResponse.json(
    {
      demo_label: REFERENCE_GATEWAY_LABEL,
      code: "gateway_disabled",
      message: "Reference gateway is disabled. Set X402_REF_GATEWAY_ENABLED=true and required operator env vars.",
    },
    { status: 404 },
  );
}

function misconfiguredResponse(missing: string[]): NextResponse {
  return NextResponse.json(
    {
      demo_label: REFERENCE_GATEWAY_LABEL,
      code: "gateway_misconfigured",
      message: "Reference gateway enabled but missing required configuration.",
      missing_env: missing,
    },
    { status: 503 },
  );
}

export async function GET(req: NextRequest) {
  const resolved = resolveReferenceGatewayConfig();
  if (!resolved.enabled) return disabledResponse();
  if (!resolved.config) return misconfiguredResponse(resolved.missing);

  const receiptId = req.nextUrl.searchParams.get("receipt_id")?.trim() ?? "";
  const paymentSignatureHeader = req.headers.get("PAYMENT-SIGNATURE");

  const storePath = process.env[REFERENCE_GATEWAY_ENV.fulfillmentStorePath]?.trim()
    || join(tmpdir(), "abraxas-x402-ref-fulfillment-ledger.json");

  const result = await handleProtectedResourceRequest({
    receiptId,
    paymentSignatureHeader,
    decodePaymentSignature: decodePaymentSignatureHeader,
    config: resolved.config,
    deps: {
      fulfillmentStore: new FileFulfillmentStore({ filePath: storePath }),
      facilitator: new HttpFacilitatorClient({
        baseUrl: resolved.config.facilitatorUrl,
      }),
    },
  });

  return NextResponse.json(result.body, {
    status: result.status,
    headers: result.headers,
  });
}
