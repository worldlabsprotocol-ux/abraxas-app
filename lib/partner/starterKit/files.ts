// FILE: lib/partner/starterKit/files.ts
// Fixed templates. Interpolation is placeholder tokens only.

import { studioPackContract } from "@/lib/partner/integrationStudio/catalog";
import type { IntegrationStudioPathId } from "@/lib/partner/integrationStudio/contract";
import {
  STARTER_KIT_CANONICAL_CONTRACT,
  STARTER_KIT_DOES_NOT_DO,
  STARTER_KIT_MINIMUM_REQUIREMENTS,
  STARTER_KIT_NOTICES,
  STARTER_KIT_PLACEHOLDERS as P,
  type StarterKitOptionalCapability,
  type StarterKitRuntime,
} from "./contract";
import { serverlessFiles, universalHttpsFiles, wixVeloFiles, type StarterKitFile } from "./platforms";
import type { ValidStarterKitSelection } from "./validate";

export type { StarterKitFile };

const SAFE_PATH = /^[a-zA-Z0-9.][a-zA-Z0-9._/-]*$/;

export function assertSafeStarterPath(path: string): void {
  if (!SAFE_PATH.test(path) || path.includes("..") || path.startsWith("/")) {
    throw new Error("unsafe_starter_path");
  }
}

function kitInit(runtime: StarterKitRuntime): string {
  const envKey = runtime === "typescript_nextjs" ? "process.env.ABRAXAS_BASE_URL" : "process.env.ABRAXAS_BASE_URL";
  return `import { AbraxasPartnerKit, permitProtocolAction } from "@abraxas/partner-kit";

export const kit = new AbraxasPartnerKit({
  partnerId: process.env.ABRAXAS_PARTNER_ID ?? "${P.partner_id}",
  policyId: process.env.ABRAXAS_POLICY_ID ?? "${P.policy_id}",
  policyVersion: Number(process.env.ABRAXAS_POLICY_VERSION ?? "${P.policy_version}"),
  requirePolicyVersion: true,
  environment: "sandbox",
  baseUrl: ${envKey},
});

export { permitProtocolAction };
`;
}

function envExample(includeWebhook: boolean): string {
  return [
    `ABRAXAS_BASE_URL=https://abraxasworld.xyz`,
    `ABRAXAS_PARTNER_ID=${P.partner_id}`,
    `ABRAXAS_POLICY_ID=${P.policy_id}`,
    `ABRAXAS_POLICY_VERSION=${P.policy_version}`,
    `ABRAXAS_APP_ID=${P.app_id}`,
    `ABRAXAS_SANDBOX_API_KEY=${P.api_key}`,
    `ABRAXAS_CALLBACK_URL=${P.callback_url}`,
    includeWebhook ? `ABRAXAS_WEBHOOK_SECRET=${P.webhook_secret}` : "",
    `# Replace placeholders after Launchpad shows a sandbox key once.`,
    `# Never commit live keys or Production credentials.`,
  ].filter(Boolean).join("\n") + "\n";
}

function readme(selection: ValidStarterKitSelection): string {
  const pack = studioPackContract(selection.pack_id)!;
  return `# Abraxas partner starter kit

Generated from Integration Studio. This is a sandbox starter, not a Production credential.

${STARTER_KIT_CANONICAL_CONTRACT}

## Minimum platform requirements
${STARTER_KIT_MINIMUM_REQUIREMENTS.map((line) => `- ${line}`).join("\n")}

## Selected
- Policy pack: ${pack.display_name} (\`${selection.pack_id}\`)
- Integration path: \`${selection.path}\`
- Platform: \`${selection.platform}\`
- Runtime: \`${selection.runtime}\`
- Optional capabilities: ${selection.capabilities.length ? selection.capabilities.join(", ") : "none"}

## Partner result
You receive only the policy result this pack requested: ${pack.disclosed_result}
Abraxas withholds holder profile fields. The partner receives only the requested policy result.

${STARTER_KIT_NOTICES.google}

## Run
1. Copy \`.env.example\` to \`.env.local\` and replace placeholders.
2. Create a sandbox app in Partner Launchpad or Integration Studio. Copy the sandbox key once.
3. Install dependencies and start the server for \`${selection.runtime}\`.
4. Redirect the holder to Hosted Partner Flow, then verify the public receipt on the server.
5. Grant only when \`permitProtocolAction\` is true and the receipt is currently valid.

## Receipt verification
Fetch \`GET /api/receipts/{id}/public\` through AbraxasPartnerKit. Re-check live validity before every grant. Denied, expired, revoked, wrong-partner, and wrong-policy outcomes fail closed.

## Trading and payment
Preflight authorization only. An allowed result is not a trade, charge, transfer, or settlement.

## Wallet binding
Optional. \`signMessage\` only. Never \`signTransaction\`. Binding is not identity.

## Circle
Circle Arc testnet transfer is a separate, review-first, explicit-confirmation path. This kit does not call it.
`;
}

function doesNotDoDoc(): string {
  return `# What this starter kit does not do

${STARTER_KIT_DOES_NOT_DO.map((line) => `- ${line}`).join("\n")}

${STARTER_KIT_NOTICES.webhook}
${STARTER_KIT_NOTICES.solana}
${STARTER_KIT_NOTICES.venue}
${STARTER_KIT_NOTICES.payment}
${STARTER_KIT_NOTICES.portable}
${STARTER_KIT_NOTICES.wallet}
`;
}

function deployment(): string {
  return `# Deployment checklist

- [ ] Placeholders replaced only on the server. No keys in the browser bundle.
- [ ] Callback URL allowlisted in Launchpad. Localhost is sandbox-only.
- [ ] Receipt verification uses AbraxasPartnerKit and live \`currently_valid\`.
- [ ] Webhook HMAC verified, duplicates ignored, then public receipt re-fetched.
- [ ] Trading, payment, or generic action preflight uses partner/policy/version/scope/expiry/one-time nonce.
- [ ] Allowed means your system may perform its own named action. Abraxas never executes it.
- [ ] Wallet binding stays optional and never signs a transaction.
- [ ] Production upgrade remains reviewed. This kit does not issue live access.
- [ ] Policy review still required before a live grant.
- [ ] Circle testnet transfer stays off this path.
`;
}

function fixtureTest(): string {
  return `import { describe, expect, it } from "vitest";
import fixture from "./public-receipt.fixture.json";

describe("local receipt fixture", () => {
  it("is a sandbox public receipt without holder data", () => {
    expect(fixture.environment).toBe("sandbox");
    expect(fixture.decision).toBe("approved");
    expect(fixture.currently_valid).toBe(true);
    expect("email" in fixture).toBe(false);
    expect("profile" in fixture).toBe(false);
  });

  it("fails closed when currently_valid is false", () => {
    const expired = { ...fixture, currently_valid: false, decision: "expired" };
    expect(expired.currently_valid).toBe(false);
  });
});
`;
}

function fixtureJson(): string {
  return `${JSON.stringify({
    environment: "sandbox",
    decision: "approved",
    currently_valid: true,
    partner_id: P.partner_id,
    policy_id: P.policy_id,
    policy_version: P.policy_version,
    note: "Synthetic fixture. Replace by fetching GET /api/receipts/{id}/public at runtime. Do not paste raw production receipts.",
  }, null, 2)}\n`;
}

function receiptRoute(runtime: StarterKitRuntime): string {
  if (runtime === "typescript_nextjs") {
    return `import { NextRequest, NextResponse } from "next/server";
import { kit, permitProtocolAction } from "../../../lib/abraxas";

export async function GET(req: NextRequest) {
  const result = await kit.verifyCallback(req.nextUrl.searchParams);
  if (!permitProtocolAction(result)) {
    return NextResponse.json({ action: "deny", outcome: result.outcome, errors: result.errors }, { status: 403 });
  }
  return NextResponse.json({ action: "permit", outcome: "permitted" });
}
`;
  }
  return `import type { Request, Response } from "express";
import { kit, permitProtocolAction } from "./lib/abraxas";

export async function receiptCallback(req: Request, res: Response) {
  const result = await kit.verifyCallback(new URLSearchParams(req.query as Record<string, string>));
  if (!permitProtocolAction(result)) {
    return res.status(403).json({ action: "deny", outcome: result.outcome, errors: result.errors });
  }
  return res.json({ action: "permit", outcome: "permitted" });
}
`;
}

function hostedHelper(): string {
  return `import { kit } from "./abraxas";

export function startHostedPartnerFlow() {
  const returnUrl = process.env.ABRAXAS_CALLBACK_URL ?? "${P.callback_url}";
  return kit.createHostedVerificationUrl(returnUrl);
}
`;
}

function webhookRoute(runtime: StarterKitRuntime): string {
  if (runtime === "typescript_nextjs") {
    return `import { NextRequest, NextResponse } from "next/server";
import { kit, permitProtocolAction } from "../../../lib/abraxas";
import { verifyPartnerWebhookEvent } from "@abraxas/partner-kit/webhooks";

const seenEventIds = new Set<string>();

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const verified = verifyPartnerWebhookEvent({
    secret: process.env.ABRAXAS_WEBHOOK_SECRET ?? "${P.webhook_secret}",
    timestamp: req.headers.get("x-abraxas-webhook-timestamp") ?? "",
    rawBody,
    signatureHeader: req.headers.get("x-abraxas-webhook-signature") ?? "",
    expectedPartnerId: kit.options.partnerId,
    seenEventIds,
  });
  if (!verified.ok) {
    return NextResponse.json({ accepted: false, error: verified.error }, { status: 400 });
  }
  if (verified.duplicate) {
    return NextResponse.json({ accepted: true, duplicate: true, grant: false });
  }
  const receiptId = verified.payload.receipt_id;
  if (!receiptId) {
    return NextResponse.json({ accepted: true, grant: false, reason: "no_receipt" });
  }
  const result = await kit.verifyReceiptId(receiptId);
  if (!permitProtocolAction(result)) {
    return NextResponse.json({ accepted: true, grant: false, outcome: result.outcome });
  }
  return NextResponse.json({ accepted: true, grant: true, outcome: "permitted" });
}
`;
  }
  return `import type { Request, Response } from "express";
import { kit, permitProtocolAction } from "./lib/abraxas";
import { verifyPartnerWebhookEvent } from "@abraxas/partner-kit/webhooks";

const seenEventIds = new Set<string>();

export async function webhookHandler(req: Request, res: Response) {
  const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
  const verified = verifyPartnerWebhookEvent({
    secret: process.env.ABRAXAS_WEBHOOK_SECRET ?? "${P.webhook_secret}",
    timestamp: String(req.header("x-abraxas-webhook-timestamp") ?? ""),
    rawBody,
    signatureHeader: String(req.header("x-abraxas-webhook-signature") ?? ""),
    expectedPartnerId: kit.options.partnerId,
    seenEventIds,
  });
  if (!verified.ok) {
    return res.status(400).json({ accepted: false, error: verified.error });
  }
  if (verified.duplicate || !verified.payload.receipt_id) {
    return res.json({ accepted: true, grant: false });
  }
  const result = await kit.verifyReceiptId(verified.payload.receipt_id);
  if (!permitProtocolAction(result)) {
    return res.json({ accepted: true, grant: false, outcome: result.outcome });
  }
  return res.json({ accepted: true, grant: true, outcome: "permitted" });
}
`;
}

function venuePreflight(runtime: StarterKitRuntime): string {
  const body = `import { AbraxasTradingVenueAdapter } from "@abraxas/partner-kit/trading-venue";
import { kit, permitProtocolAction } from ${runtime === "typescript_nextjs" ? '"../../../lib/abraxas"' : '"./lib/abraxas"'};

const venue = new AbraxasTradingVenueAdapter({ kit });

export async function tradingPreflight() {
  const receipt = await kit.verifyReceiptId("REPLACE_WITH_RECEIPT_ID_AT_RUNTIME");
  if (!permitProtocolAction(receipt)) {
    return { allowed: false, reason: receipt.outcome };
  }
  return venue.authorize({
    action_type: "enable_market_access",
    action_scope: "sandbox:market_access",
  });
}
`;
  if (runtime === "typescript_nextjs") {
    return `import { NextResponse } from "next/server";
${body}
export async function POST() {
  const result = await tradingPreflight();
  return NextResponse.json({ allowed: result.allowed === true, reason: "reason" in result ? result.reason : "permitted" });
}
`;
  }
  return body;
}

function paymentPreflight(runtime: StarterKitRuntime): string {
  const body = `import { AbraxasPaymentAuthorizationAdapter } from "@abraxas/partner-kit/payment-authorization";
import { kit, permitProtocolAction } from ${runtime === "typescript_nextjs" ? '"../../../lib/abraxas"' : '"./lib/abraxas"'};

const payments = new AbraxasPaymentAuthorizationAdapter({ kit });

export async function paymentPreflight() {
  const receipt = await kit.verifyReceiptId("REPLACE_WITH_RECEIPT_ID_AT_RUNTIME");
  if (!permitProtocolAction(receipt)) {
    return { allowed: false, reason: receipt.outcome };
  }
  return payments.authorize({
    action_type: "authorize_checkout",
    action_scope: "sandbox:checkout",
  });
}
`;
  if (runtime === "typescript_nextjs") {
    return `import { NextResponse } from "next/server";
${body}
export async function POST() {
  const result = await paymentPreflight();
  return NextResponse.json({
    allowed: result.allowed === true,
    authorization_kind: "not_a_payment",
  });
}
`;
  }
  return body;
}

function portablePreflight(runtime: StarterKitRuntime): string {
  const body = `import { AbraxasPortableActionAdapter } from "@abraxas/partner-kit/portable-action-contract";
import { kit } from ${runtime === "typescript_nextjs" ? '"../../../lib/abraxas"' : '"./lib/abraxas"'};

const actions = new AbraxasPortableActionAdapter({
  partnerId: kit.options.partnerId,
  policyId: kit.options.policyId,
  policyVersion: kit.options.policyVersion,
  requirePolicyVersion: true,
  environment: "sandbox",
});

export async function portablePreflight(receiptId: string) {
  const contract = actions.issueActionContract({
    action_type: "partner_protocol_action",
    action_scope: "sandbox:partner_protocol",
  });
  if ("ok" in contract && contract.ok === false) {
    return { allowed: false, reason: contract.reason };
  }
  const verified = await actions.verifySignedReceipt(receiptId);
  // allowed means your app may perform its named action. Abraxas never executes it.
  return actions.preflight({ result: verified, contract });
}
`;
  if (runtime === "typescript_nextjs") {
    return `import { NextResponse } from "next/server";
${body}
export async function POST() {
  const result = await portablePreflight("REPLACE_WITH_RECEIPT_ID_AT_RUNTIME");
  return NextResponse.json({ allowed: result.allowed === true, reason: "reason" in result ? result.reason : "permitted" });
}
`;
  }
  return body;
}

function solanaGate(): string {
  return `import { AbraxasSolanaPartnerAdapter } from "@abraxas/partner-kit/solana";
import { kit, permitProtocolAction } from "./abraxas";

const solana = new AbraxasSolanaPartnerAdapter({ kit });

export async function solanaEligibilityGate() {
  const receipt = await kit.verifyReceiptId("REPLACE_WITH_RECEIPT_ID_AT_RUNTIME");
  if (!permitProtocolAction(receipt)) {
    return { allowed: false, reason: receipt.outcome };
  }
  return solana.verifyEligibility({ creates_transactions: false, funds_movement: false });
}
`;
}

function walletBinding(): string {
  return `import { signWalletStandardChallenge } from "@abraxas/partner-kit/wallet-standard";

export async function optionalWalletBinding(wallet: { signMessage: (message: Uint8Array) => Promise<Uint8Array> }) {
  return signWalletStandardChallenge({
    wallet,
    purpose: "optional_action_binding",
  });
}
`;
}

function expressServer(include: {
  webhook: boolean;
  venue: boolean;
  payment: boolean;
  portable: boolean;
}): string {
  return `import express from "express";
import { receiptCallback } from "./callback";
${include.webhook ? 'import { webhookHandler } from "./webhook";\n' : ""}${include.venue ? 'import { tradingPreflight } from "./trading-preflight";\n' : ""}${include.payment ? 'import { paymentPreflight } from "./payment-preflight";\n' : ""}${include.portable ? 'import { portablePreflight } from "./portable-preflight";\n' : ""}
const app = express();
app.use(express.text({ type: "*/*" }));
app.get("/auth/abraxas/callback", (req, res) => void receiptCallback(req, res));
${include.webhook ? 'app.post("/webhooks/abraxas", (req, res) => void webhookHandler(req, res));\n' : ""}${include.venue ? 'app.post("/preflight/trading", async (_req, res) => res.json(await tradingPreflight()));\n' : ""}${include.payment ? 'app.post("/preflight/payment", async (_req, res) => res.json(await paymentPreflight()));\n' : ""}${include.portable ? 'app.post("/preflight/action", async (_req, res) => res.json(await portablePreflight("REPLACE_WITH_RECEIPT_ID_AT_RUNTIME")));\n' : ""}
app.listen(3000);
`;
}

function packageJson(runtime: StarterKitRuntime): string {
  const scripts = runtime === "typescript_nextjs"
    ? { dev: "next dev", test: "vitest run" }
    : runtime === "typescript_express"
      ? { start: "tsx src/server.ts", test: "vitest run" }
      : { test: "vitest run" };
  return `${JSON.stringify({
    name: "abraxas-partner-starter",
    private: true,
    version: "0.0.0",
    scripts,
    dependencies: {
      "@abraxas/partner-kit": "workspace:*",
    },
  }, null, 2)}\n`;
}

function needs(path: IntegrationStudioPathId, caps: StarterKitOptionalCapability[], id: StarterKitOptionalCapability | "webhooks"): boolean {
  if (path === "webhook_events" && id === "webhooks") return true;
  if (path === id) return true;
  return caps.includes(id as StarterKitOptionalCapability);
}

export function buildStarterKitFiles(selection: ValidStarterKitSelection): StarterKitFile[] {
  const webhook = needs(selection.path, selection.capabilities, "webhooks");
  const venue = selection.path === "trading_venue" || selection.capabilities.includes("trading_venue");
  const payment = selection.path === "payment_authorization" || selection.capabilities.includes("payment_authorization");
  const solana = selection.path === "solana_gate"
    || selection.capabilities.includes("solana_gate")
    || selection.platform === "solana_backend";
  const wallet = selection.path === "wallet_standard_binding" || selection.capabilities.includes("wallet_standard_binding");
  const portable = selection.path === "portable_action_contract" || selection.capabilities.includes("portable_action_contract");
  const include = { webhook, venue, payment, solana, wallet, portable };

  const files: StarterKitFile[] = [
    { path: "README.md", contents: readme(selection) },
    { path: "WHAT_THIS_DOES_NOT_DO.md", contents: doesNotDoDoc() },
    { path: "DEPLOYMENT.md", contents: deployment() },
    { path: ".env.example", contents: envExample(webhook) },
    { path: "package.json", contents: packageJson(selection.runtime) },
    { path: "tests/public-receipt.fixture.json", contents: fixtureJson() },
    { path: "tests/receipt-fixture.test.ts", contents: fixtureTest() },
  ];

  if (selection.runtime === "typescript_nextjs") {
    files.push({ path: "src/lib/abraxas.ts", contents: kitInit(selection.runtime) });
    files.push({ path: "app/api/abraxas/callback/route.ts", contents: receiptRoute("typescript_nextjs") });
    files.push({ path: "src/lib/hosted.ts", contents: hostedHelper() });
    if (webhook) files.push({ path: "app/api/abraxas/webhooks/route.ts", contents: webhookRoute("typescript_nextjs") });
    if (venue) files.push({ path: "app/api/abraxas/trading-preflight/route.ts", contents: venuePreflight("typescript_nextjs") });
    if (payment) files.push({ path: "app/api/abraxas/payment-preflight/route.ts", contents: paymentPreflight("typescript_nextjs") });
    if (portable) files.push({ path: "app/api/abraxas/action-preflight/route.ts", contents: portablePreflight("typescript_nextjs") });
    if (solana) files.push({ path: "src/lib/solana-gate.ts", contents: solanaGate() });
    if (wallet) files.push({ path: "src/lib/wallet-binding.ts", contents: walletBinding() });
  } else if (selection.runtime === "typescript_express") {
    files.push({ path: "src/lib/abraxas.ts", contents: kitInit(selection.runtime) });
    files.push({ path: "src/callback.ts", contents: receiptRoute("typescript_express") });
    files.push({ path: "src/lib/hosted.ts", contents: hostedHelper() });
    if (webhook) files.push({ path: "src/webhook.ts", contents: webhookRoute("typescript_express") });
    if (venue) files.push({ path: "src/trading-preflight.ts", contents: venuePreflight("typescript_express") });
    if (payment) files.push({ path: "src/payment-preflight.ts", contents: paymentPreflight("typescript_express") });
    if (portable) files.push({ path: "src/portable-preflight.ts", contents: portablePreflight("typescript_express") });
    files.push({ path: "src/server.ts", contents: expressServer({ webhook, venue, payment, portable }) });
    if (solana) files.push({ path: "src/lib/solana-gate.ts", contents: solanaGate() });
    if (wallet) files.push({ path: "src/lib/wallet-binding.ts", contents: walletBinding() });
  } else if (selection.runtime === "universal_https") {
    files.push(...universalHttpsFiles(include));
  } else if (selection.runtime === "javascript_wix_velo") {
    files.push(...wixVeloFiles({ webhook, venue, payment, wallet, portable }));
  } else {
    files.push(...serverlessFiles(include));
  }

  for (const file of files) assertSafeStarterPath(file.path);
  return files;
}
