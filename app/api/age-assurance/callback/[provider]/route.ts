// FILE: app/api/age-assurance/callback/[provider]/route.ts
// Provider callback — server-side verification only; placeholders hard-disabled.

import { NextRequest, NextResponse } from "next/server";
import { assertKnownProvider } from "@/lib/assurance/ageProviders/registry";
import { isProviderAuthoritative } from "@/lib/assurance/ageProviders/providerAuthority";

export const dynamic = "force-dynamic";

function callbackDisabledResponse(code: string, status = 503): NextResponse {
  return NextResponse.json({ ok: false, code }, { status });
}

async function rejectNonAuthoritativeCallback(
  providerId: string,
): Promise<NextResponse | null> {
  let provider;
  try {
    provider = assertKnownProvider(providerId);
  } catch {
    return callbackDisabledResponse("unknown_provider", 400);
  }

  if (!isProviderAuthoritative(provider)) {
    return callbackDisabledResponse("provider_not_authoritative", 503);
  }

  return null;
}

/**
 * Placeholder and unsigned callback paths are disabled.
 * Production vendor adapters must verify signed server-to-server payloads in a
 * dedicated integration — never query-string or frontend-supplied approval.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider: providerId } = await context.params;
  const rejected = await rejectNonAuthoritativeCallback(providerId);
  if (rejected) return rejected;
  return callbackDisabledResponse("callback_not_implemented", 501);
}

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider: providerId } = await context.params;
  const rejected = await rejectNonAuthoritativeCallback(providerId);
  if (rejected) return rejected;
  return callbackDisabledResponse("callback_not_implemented", 501);
}
