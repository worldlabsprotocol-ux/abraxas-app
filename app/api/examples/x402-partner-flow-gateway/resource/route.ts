// FILE: app/api/examples/x402-partner-flow-gateway/resource/route.ts
// TESTNET / DEMO ONLY — reference x402 + Abraxas Partner Flow gateway.
// Base Sepolia (eip155:84532) + x402 v2 headers. Not production. No Abraxas custody.

import { NextRequest, NextResponse } from "next/server";
import {
  assessReferenceGatewayRuntime,
  decodePaymentSignatureHeader,
  handleProtectedResourceRequest,
  HttpFacilitatorClient,
  NoOpFulfillmentStore,
  REFERENCE_GATEWAY_LABEL,
  resolveReferenceGatewayConfig,
  type FulfillmentStore,
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

function invalidConfigResponse(errors: string[]): NextResponse {
  return NextResponse.json(
    {
      demo_label: REFERENCE_GATEWAY_LABEL,
      code: "gateway_invalid_config",
      message: "Reference gateway configuration failed startup validation.",
      validation_errors: errors,
    },
    { status: 503 },
  );
}

function runtimeBlockedResponse(reason: string): NextResponse {
  return NextResponse.json(
    {
      demo_label: REFERENCE_GATEWAY_LABEL,
      code: "gateway_runtime_blocked",
      message: "Reference gateway cannot run in this deployment environment.",
      reason,
    },
    { status: 503 },
  );
}

export async function GET(req: NextRequest) {
  const resolved = resolveReferenceGatewayConfig();
  if (!resolved.enabled) return disabledResponse();
  if (!resolved.config) {
    if (resolved.validation?.errors.length) {
      return invalidConfigResponse(resolved.validation.errors);
    }
    return misconfiguredResponse(resolved.missing);
  }

  const runtime = assessReferenceGatewayRuntime();
  if (!runtime.routeAllowed) {
    return runtimeBlockedResponse(runtime.reason ?? "runtime_blocked");
  }

  const receiptId = req.nextUrl.searchParams.get("receipt_id")?.trim() ?? "";
  const paymentSignatureHeader = req.headers.get("PAYMENT-SIGNATURE");

  if (paymentSignatureHeader && !runtime.settlementAllowed) {
    return NextResponse.json(
      {
        demo_label: REFERENCE_GATEWAY_LABEL,
        code: "settlement_unavailable",
        message: "Payment settlement requires a durable fulfillment store adapter.",
        reason: runtime.reason ?? "durable_fulfillment_store_required",
      },
      { status: 503 },
    );
  }

  if (runtime.settlementAllowed && !runtime.createFulfillmentStore) {
    return runtimeBlockedResponse(runtime.reason ?? "fulfillment_store_unavailable");
  }

  const fulfillmentStore: FulfillmentStore = runtime.settlementAllowed
    ? runtime.createFulfillmentStore!()
    : new NoOpFulfillmentStore();

  const result = await handleProtectedResourceRequest({
    receiptId,
    paymentSignatureHeader,
    decodePaymentSignature: decodePaymentSignatureHeader,
    config: resolved.config,
    settlementEnabled: runtime.settlementAllowed,
    deps: {
      fulfillmentStore,
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
