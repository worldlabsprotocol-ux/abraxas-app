// FILE: app/api/v1/provider-events/route.ts
// Machine-to-machine provider event ingestion — NOT browser-accessible partner API.

import { NextRequest, NextResponse } from "next/server";
import { processProviderEvent } from "@/lib/identity/providerIngestion/adapter";
import { isPartnerApiKeyAttempt } from "@/lib/identity/providerIngestion/authenticate";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const providerId = req.headers.get("x-abraxas-provider-id")?.trim() ?? "";
  const signature = req.headers.get("x-abraxas-provider-signature");
  const timestamp = req.headers.get("x-abraxas-provider-timestamp");
  const apiKeyHeader =
    req.headers.get("x-api-key")
    ?? req.headers.get("x-abraxas-api-key")
    ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    ?? null;

  if (isPartnerApiKeyAttempt(apiKeyHeader)) {
    return NextResponse.json(
      { error: "partner_api_key_cannot_authenticate_provider_events" },
      { status: 403 },
    );
  }

  const result = await processProviderEvent({
    rawBody,
    providerId,
    signature,
    timestamp,
    apiKeyHeader,
  });

  const status = result.ok
    ? result.outcome === "duplicate" ? 200 : 201
    : result.code === "duplicate_event" ? 200
      : 400;

  return NextResponse.json({
    ok: result.ok,
    outcome: result.outcome,
    code: result.code,
    normalized_claim_types: result.normalized_claim_types,
  }, { status: result.ok ? status : (result.code.startsWith("provider_") ? 401 : 400) });
}
