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
  const result = await kit.verifyCallback(req.nextUrl.searchParams);
  // Permit only outcome === permitted. Draft, deprecated, missing, mismatched,
  // unknown, and future policy versions fail closed. Only a verified permitted
  // result authorizes a partner action.
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

export const CONFORMANCE_COMMAND_EXAMPLE = `PARTNER_FLOW_RP_PARTNER_ID=your-protocol-partner \\
PARTNER_FLOW_RP_POLICY_ID=your-protocol-policy-v1 \\
PARTNER_FLOW_RP_RETURN_URL=https://your-app.example.com/auth/abraxas/callback \\
PARTNER_FLOW_RP_BASE_URL=https://abraxasworld.xyz \\
npm run partner:conformance`;
