// FILE: lib/partner/integrationKit/examples.ts
// Copy paste partner examples. These are documentation strings, not executable partner code.

import type { AbraxasPartnerKitOptions } from "@/lib/partner/integrationKit/client";

export function nextjsRouteHandlerExample(opts: Pick<AbraxasPartnerKitOptions, "partnerId" | "policyId" | "environment" | "policyVersion">): string {
  return `// app/api/abraxas/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { AbraxasPartnerKit, permitProtocolAction } from "@/lib/partner/integrationKit";

const kit = new AbraxasPartnerKit({
  partnerId: "${opts.partnerId}",
  policyId: "${opts.policyId}",
  policyVersion: ${opts.policyVersion ?? 1},
  requirePolicyVersion: true,
  environment: "${opts.environment}",
  baseUrl: process.env.ABRAXAS_BASE_URL,
});

export async function GET(req: NextRequest) {
  const parsed = kit.parseCallback(req.nextUrl.searchParams);
  if (!parsed.ok) {
    return NextResponse.json({ action: "deny", errors: parsed.errors }, { status: 400 });
  }
  const result = await kit.verifyForAction({
    receiptId: parsed.params.receipt_id!,
    callbackRequestId: parsed.params.request_id,
    expectedRequestId: process.env.ABRAXAS_EXPECTED_REQUEST_ID,
  });
  if (!permitProtocolAction(result)) {
    return NextResponse.json({ action: "deny", outcome: result.outcome, errors: result.errors }, { status: 403 });
  }
  return NextResponse.json({ action: "permit", outcome: "permitted" });
}
`;
}

export function expressHandlerExample(opts: Pick<AbraxasPartnerKitOptions, "partnerId" | "policyId" | "environment" | "policyVersion">): string {
  return `// express callback
import { AbraxasPartnerKit, permitProtocolAction } from "@/lib/partner/integrationKit";

const kit = new AbraxasPartnerKit({
  partnerId: "${opts.partnerId}",
  policyId: "${opts.policyId}",
  policyVersion: ${opts.policyVersion ?? 1},
  requirePolicyVersion: true,
  environment: "${opts.environment}",
  baseUrl: process.env.ABRAXAS_BASE_URL,
});

app.get("/auth/abraxas/callback", async (req, res) => {
  const result = await kit.verifyCallback(req.query);
  // permitProtocolAction is true only for permitted. All other outcomes deny.
  if (!permitProtocolAction(result)) {
    return res.status(403).json({ action: "deny", outcome: result.outcome, errors: result.errors });
  }
  return res.json({ action: "permit", outcome: "permitted" });
});
`;
}

export function genericTypescriptExample(opts: Pick<AbraxasPartnerKitOptions, "partnerId" | "policyId" | "environment" | "policyVersion">): string {
  return `import { AbraxasPartnerKit, permitProtocolAction } from "@/lib/partner/integrationKit";

const kit = new AbraxasPartnerKit({
  partnerId: "${opts.partnerId}",
  policyId: "${opts.policyId}",
  policyVersion: ${opts.policyVersion ?? 1},
  requirePolicyVersion: true,
  environment: "${opts.environment}",
});

export async function startVerification(returnUrl: string) {
  return kit.createHostedVerificationUrl(returnUrl);
}

export async function completeVerification(callbackSearch: URLSearchParams) {
  const result = await kit.verifyCallback(callbackSearch);
  // Grant only when outcome is permitted.
  if (!permitProtocolAction(result)) {
    return { grant: false, outcome: result.outcome };
  }
  return { grant: true, outcome: "permitted" };
}
`;
}

export function verifyWithAbraxasExample(opts: Pick<
  AbraxasPartnerKitOptions,
  "partnerId" | "policyId" | "environment" | "policyVersion" | "applicationId"
> & { policyPackId?: string }): string {
  return `// Server-side only — store ABRAXAS_SANDBOX_API_KEY in env, never in the browser bundle
import { AbraxasPartnerKit, permitProtocolAction } from "@/lib/partner/integrationKit";

const kit = new AbraxasPartnerKit({
  partnerId: "${opts.partnerId}",
  policyId: "${opts.policyId}",
  policyVersion: ${opts.policyVersion ?? 1},
  environment: "${opts.environment}",
  applicationId: process.env.ABRAXAS_APP_ID ?? "${opts.applicationId ?? "your-app-id"}",
  policyPackId: "${opts.policyPackId ?? "age_21_retail"}",
  apiKey: process.env.ABRAXAS_SANDBOX_API_KEY,
  baseUrl: process.env.ABRAXAS_BASE_URL,
});

// 1. Create durable hosted handoff (requires sandbox API key + application id)
const request = await kit.createVerificationRequest({
  returnUrl: "https://your-app.example.com/auth/abraxas/callback",
  // expectedContentHash: "…", // required only when policy pack requires source integrity
});
if (!request.ok) throw new Error(request.errors.join(", "));
// Persist request.request_id in your database (Postgres/Redis/KV) before redirect

// 2. Pass request.verification_url to your UI (or use VerifyWithAbraxas)
// 3. After callback, load request_id from durable storage — any serverless instance
const verified = await kit.verifyCallbackWithNarrowResult({
  search: callbackSearchParams,
  expectedRequestId: storedRequestId,
});
if (!verified.ok || !permitProtocolAction(verified.verification)) {
  return { grant: false, category: verified.category, errors: verified.errors };
}
// 4. Use verified.narrow for the policy-authorized narrow answer only
return { grant: true, narrow: verified.narrow };
`;
}

export const CONFORMANCE_COMMAND_EXAMPLE = `PARTNER_FLOW_RP_PARTNER_ID=your-protocol-partner \\
PARTNER_FLOW_RP_POLICY_ID=your-protocol-policy-v1 \\
PARTNER_FLOW_RP_RETURN_URL=https://your-app.example.com/auth/abraxas/callback \\
PARTNER_FLOW_RP_BASE_URL=https://abraxasworld.xyz \\
npm run partner:conformance`;
