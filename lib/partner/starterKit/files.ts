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
import { eligibilityPresentationHttpsExample, eligibilityPresentationServerExample } from "@/lib/eligibilityPresentation/examples";
import { organizationEligibilityServerExample } from "@/lib/organizationEligibility/examples";
import { crossChainProtocolAccessHttpsExample, crossChainProtocolAccessServerExample } from "@/lib/partner/crossChainProtocolAccess/examples";
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

## Eligibility presentation
Request a presentation from your backend, send the holder to Hosted Partner Flow, then verify the signed envelope and re-fetch \`GET /api/receipts/{id}/public\`. A presentation is never a bearer credential or automatic KYC/KYB approval.

## Private attestations
Abraxas verifies Reclaim proofs on its own allowlisted callback. Partners never receive the raw proof, source website data, extracted parameters, or app secrets. Continue to verify the public receipt after holder consent.


${STARTER_KIT_NOTICES.google}

## Run
1. Copy \`.env.example\` to \`.env.local\` and replace placeholders.
2. Create a sandbox app in Partner Launchpad or Integration Studio. Copy the sandbox key once.
3. Install dependencies and start the server for \`${selection.runtime}\`.
4. Redirect the holder to Hosted Partner Flow, then verify the public receipt on the server.
5. Grant only when \`permitProtocolAction\` is true and the receipt is currently valid.

## Receipt verification
Fetch \`GET /api/receipts/{id}/public\` through AbraxasPartnerKit. Re-check live validity before every grant. Denied, expired, revoked, wrong-partner, and wrong-policy outcomes fail closed. Optional: \`GET /api/receipts/verification-keys\` for public Ed25519 material. Signature verification is not a grant. Never store private signing keys.

## Trading and payment
Preflight authorization only. An allowed result is not a trade, charge, transfer, or settlement.

## Wallet binding
Optional. \`signMessage\` only. Never \`signTransaction\`. Binding is not identity.

## Circle
Circle Arc testnet transfer is a separate, review-first, explicit-confirmation path. This kit does not call it.

## EVM partner eligibility
Backend preflight only. Allowed is never a transaction, signature, gas grant, or execution. Partner execution belongs in your backend. This kit never includes RPC URLs, keys, wallets, signing code, or transaction payloads.

## Networks
Universal HTTPS remains canonical. Partners run their own chain or venue execution. Abraxas verifies and preflights only. This kit never includes RPC URLs, private keys, transaction payloads, wallet secrets, or Mainnet activation.
See /docs/multichain-mainnet-readiness.
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
${STARTER_KIT_NOTICES.evm}
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
  return `import { kit, permitProtocolAction } from "./abraxas";

export async function startHostedPartnerFlow() {
  const res = await fetch((process.env.ABRAXAS_BASE_URL ?? "https://abraxasworld.xyz") + "/api/v1/partner-handoff", {
    method: "POST",
    headers: {
      authorization: "Bearer " + (process.env.ABRAXAS_SANDBOX_API_KEY ?? "${P.api_key}"),
      "content-type": "application/json",
      "x-abraxas-application-id": process.env.ABRAXAS_APP_ID ?? "${P.app_id}",
    },
    body: JSON.stringify({ runtime: "universal_https" }),
  });
  const data = await res.json();
  if (!data.hosted_url) throw new Error("handoff_unavailable");
  return data.hosted_url;
}

export async function finishHandoff(handoffRef) {
  const res = await fetch((process.env.ABRAXAS_BASE_URL ?? "https://abraxasworld.xyz") + "/api/v1/partner-handoff/" + handoffRef, {
    headers: { authorization: "Bearer " + (process.env.ABRAXAS_SANDBOX_API_KEY ?? "${P.api_key}") },
  });
  const data = await res.json();
  if (!data.public_receipt_id) return { grant: false, reason: "not_ready" };
  const receipt = await kit.verifyReceiptId(data.public_receipt_id);
  return { grant: permitProtocolAction(receipt) === true, outcome: receipt.outcome };
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
// Server sandbox config selects generic_trading_venue or hyperliquid_trading_venue.
// Never accept venue_profile_id, orders, balances, or Production fields from the browser.

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

function evmPreflight(runtime: StarterKitRuntime): string {
  const body = `import { AbraxasEvmPartnerAdapter } from "@abraxas/partner-kit/evm";
import { kit } from ${runtime === "typescript_nextjs" ? '"../../../lib/abraxas"' : '"./lib/abraxas"'};

const evm = new AbraxasEvmPartnerAdapter({
  partnerId: kit.options.partnerId,
  policyId: kit.options.policyId,
  policyVersion: kit.options.policyVersion,
  requirePolicyVersion: true,
  environment: "sandbox",
});

export async function evmPreflight(receiptId: string) {
  const contract = evm.issueActionContract({
    action_type: "enable_protocol_access",
    action_scope: "sandbox:protocol_access",
  });
  if ("ok" in contract && contract.ok === false) {
    return { allowed: false, reason: contract.reason };
  }
  const verified = await evm.verifySignedReceipt(receiptId);
  const result = await evm.preflight({ result: verified, contract });
  if (!result.allowed) return result;
  // PARTNER EXECUTION BELONGS HERE.
  // Use your own RPC, signer, contract, gas, and transaction construction.
  // Do not send chain IDs, calldata, wallets, or transaction payloads to Abraxas.
  return result;
}

export async function optionalEvmWalletControl(origin: string, contract) {
  // Only when wallet_binding is optional or required on this EVM action.
  // Sign this message to prove control for this one action.
  // No transaction will be created or signed.
  // Abraxas does not read your balances or hold your keys.
  // Holder uses personal_sign / EIP-191 only. Store binding_ref. Never store an address.
  return { origin, nonce: contract.nonce, method: "personal_sign" };
}
`;
  if (runtime === "typescript_nextjs") {
    return `import { NextResponse } from "next/server";
${body}
export async function POST() {
  const result = await evmPreflight("REPLACE_WITH_RECEIPT_ID_AT_RUNTIME");
  return NextResponse.json({ allowed: result.allowed === true, reason: "reason" in result ? result.reason : "permitted" });
}
`;
  }
  return body;
}

function onchainGate(): string {
  return `// Server-only. Request a short-lived chain eligibility attestation.
export async function issueOnchainGate(receiptId) {
  const res = await fetch((process.env.ABRAXAS_BASE_URL ?? "https://abraxasworld.xyz") + "/api/v1/chain-attestations", {
    method: "POST",
    headers: {
      authorization: "Bearer " + (process.env.ABRAXAS_SANDBOX_API_KEY ?? "${P.api_key}"),
      "content-type": "application/json",
      "x-abraxas-application-id": process.env.ABRAXAS_APP_ID ?? "${P.app_id}",
    },
    body: JSON.stringify({
      receipt_id: receiptId,
      action_type: "enable_protocol_access",
      action_scope: "sandbox:protocol_access",
      network_id: "evm_sandbox",
      deployment_ref: process.env.ABRAXAS_GATE_DEPLOYMENT_REF,
    }),
  });
  const issued = await res.json();
  // Pass typed_data + signature to YOUR verifier. Abraxas never submits a transaction.
  // A valid attestation is not a payment, transfer, trade, token approval, or gas authorization.
  return issued;
}
`;
}

function evmVerifierDoc(): string {
  return `# EVM contract integration

Copy \`contracts/evm-eligibility-verifier/src/AbraxasEligibilityVerifier.sol\` and
\`AbraxasPartnerEligibilityGate.sol\` into your repository and deploy them yourself.
Abraxas does not deploy a shared execution contract and does not claim any live-chain, Arc, or Mainnet deployment.

The partner gate verifies:
- trusted Abraxas signer
- EIP-712 domain (name AbraxasEligibilityVerifier, version 1, chainId, verifyingContract, partnerHash)
- expiry, one-time nonce, partner/policy/action/environment hashes
- optional required subject/wallet binding hash

It returns only an eligibility authorization. It cannot transfer tokens, approve ERC-20 spending, or accept amounts/recipients/calldata.

Local: \`cd contracts/evm-eligibility-verifier && forge test -vv\`
`;
}

function evmPartnerGateDoc(): string {
  return `# EVM onchain eligibility gate

Local sequence:
1. Holder completes private verification.
2. Your server verifies the current public receipt.
3. POST /api/v1/chain-attestations with action_type enable_protocol_access (server API key).
4. Your gate consumeEligibility verifies EIP-712 and consumes the nonce once.
5. Your consumer records that the named action may proceed. No transfer, mint, swap, or payment.

\`\`\`
cd contracts/evm-eligibility-verifier
forge test -vv
\`\`\`

Human-only deploy: supply your own RPC URL and deployer key at the command line. Do not put them in Vercel or this repo.
Manifest status is \`local_test\` or \`partner_deployed\` only. Never \`live\`.
Arc/Circle Mainnet stays disabled. Circle settlement is a separate product path.
`;
}

function signerLifecycleDoc(): string {
  return `# Chain attestation signer lifecycle

Abraxas issues EVM secp256k1 and Solana Ed25519 attestations with dedicated environment keys.
Receipt private keys are never reused.

When a signer is retiring or revoked:
1. Abraxas stops issuing new attestations with that key.
2. You receive a signer-update package (not a transaction).
3. You call addTrustedSigner / retireTrustedSigner / revokeTrustedSigner on your EVM gate, or add_trusted_signer / retire_trusted_signer / revoke_trusted_signer on your Solana GateConfig.
4. Issuance stays blocked until your verified deployment config matches the required signer set.

Public verifier material:
GET /api/chain-attestations/verification-keys/evm
GET /api/chain-attestations/verification-keys/solana

A compromised private key cannot be recovered. Abraxas never broadcasts your update.
`;
}

function evmOnchainGate(): string {
  return `// Server-only. Request an EIP-712 eligibility authorization for YOUR gate.
export async function issueEvmOnchainGate(receiptId) {
  const res = await fetch((process.env.ABRAXAS_BASE_URL ?? "https://abraxasworld.xyz") + "/api/v1/chain-attestations", {
    method: "POST",
    headers: {
      authorization: "Bearer " + (process.env.ABRAXAS_SANDBOX_API_KEY ?? "${P.api_key}"),
      "content-type": "application/json",
      "x-abraxas-application-id": process.env.ABRAXAS_APP_ID ?? "${P.app_id}",
    },
    body: JSON.stringify({
      receipt_id: receiptId,
      action_type: "enable_protocol_access",
      action_scope: "sandbox:protocol_access",
      network_id: "evm_sandbox",
      deployment_ref: process.env.ABRAXAS_GATE_DEPLOYMENT_REF,
    }),
  });
  const issued = await res.json();
  // Encode consumeEligibility on YOUR contract. Abraxas never broadcasts.
  return issued;
}
`;
}

function solanaProgramDoc(): string {
  return `# Solana onchain eligibility gate

Copy \`solana/abraxas-eligibility-gate\` into your repository. Local/reference only.
Abraxas does not deploy this program to devnet or Mainnet. Local program IDs are fixtures for ProgramTest.

Flow:
1. Holder completes private verification.
2. Your server verifies the current public receipt.
3. Abraxas signs a 468-byte ABRAXAS_CHAIN_ELIGIBILITY_V2 message with a dedicated Ed25519 attestation key.
4. Your transaction places the Ed25519 native verify instruction immediately before \`authorize\`.
5. Your program CPI-consumes the authorization PDA once.

Local commands:
\`\`\`
cd solana/abraxas-eligibility-gate
cargo test --workspace
# Optional if you have the Anchor toolchain installed:
# anchor build
# anchor test
\`\`\`

Devnet checklist (human operator only; this starter does not deploy):
- Generate a program keypair you control.
- Confirm the dedicated attestation signer key ID (not a receipt key).
- Set trusted signer, partner program ID, policy/action hashes, network, and environment on-chain as admin.
- Do not treat a successful local test as a live deployment.

PDA seeds:
- config: ["gate_config", admin]
- authorization: ["authorization", config, attestation_id]
- consumer authority: ["consumer_authority"] (partner program)

The program never transfers SOL or tokens. Server durable nonce consumption (migration 101) remains required in addition to the onchain PDA.
`;
}

function deploymentManifestTemplate(): string {
  return `{
  "schema_version": 1,
  "gate_type": "evm",
  "network_id": "evm_sandbox",
  "chain_id": 31337,
  "gate_address": "{{GATE_ADDRESS}}",
  "bytecode_hash": "{{BYTECODE_HASH}}",
  "config_digest": "{{CONFIG_DIGEST}}",
  "partner_hash": "{{PARTNER_HASH}}",
  "policy_hash": "{{POLICY_HASH}}",
  "action_hash": "{{ACTION_HASH}}",
  "action_type": "enable_protocol_access",
  "action_scope": "sandbox:protocol_access",
  "environment": "sandbox",
  "signer_key_id": "{{SIGNER_KEY_ID}}",
  "subject_binding_mode": "optional"
}
`;
}

function solanaOnchainGate(): string {
  return `// Server-only. Request a Solana onchain eligibility authorization.
export async function issueSolanaOnchainGate(receiptId) {
  const res = await fetch((process.env.ABRAXAS_BASE_URL ?? "https://abraxasworld.xyz") + "/api/v1/chain-attestations", {
    method: "POST",
    headers: {
      authorization: "Bearer " + (process.env.ABRAXAS_SANDBOX_API_KEY ?? "${P.api_key}"),
      "content-type": "application/json",
      "x-abraxas-application-id": process.env.ABRAXAS_APP_ID ?? "${P.app_id}",
    },
    body: JSON.stringify({
      receipt_id: receiptId,
      action_type: "partner_protocol_action",
      action_scope: "sandbox:partner_protocol",
      network_id: "solana_devnet",
      deployment_ref: process.env.ABRAXAS_GATE_DEPLOYMENT_REF,
      wallet_binding_mode: "required",
    }),
  });
  const issued = await res.json();
  // Place Ed25519 verify immediately before YOUR gate authorize instruction.
  // Consume the PDA from YOUR program. Abraxas never submits the transaction.
  return issued;
}
`;
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
  evm: boolean;
}): string {
  return `import express from "express";
import { receiptCallback } from "./callback";
${include.webhook ? 'import { webhookHandler } from "./webhook";\n' : ""}${include.venue ? 'import { tradingPreflight } from "./trading-preflight";\n' : ""}${include.payment ? 'import { paymentPreflight } from "./payment-preflight";\n' : ""}${include.portable ? 'import { portablePreflight } from "./portable-preflight";\n' : ""}${include.evm ? 'import { evmPreflight } from "./evm-preflight";\n' : ""}
const app = express();
app.use(express.text({ type: "*/*" }));
app.get("/auth/abraxas/callback", (req, res) => void receiptCallback(req, res));
${include.webhook ? 'app.post("/webhooks/abraxas", (req, res) => void webhookHandler(req, res));\n' : ""}${include.venue ? 'app.post("/preflight/trading", async (_req, res) => res.json(await tradingPreflight()));\n' : ""}${include.payment ? 'app.post("/preflight/payment", async (_req, res) => res.json(await paymentPreflight()));\n' : ""}${include.portable ? 'app.post("/preflight/action", async (_req, res) => res.json(await portablePreflight("REPLACE_WITH_RECEIPT_ID_AT_RUNTIME")));\n' : ""}${include.evm ? 'app.post("/preflight/evm", async (_req, res) => res.json(await evmPreflight("REPLACE_WITH_RECEIPT_ID_AT_RUNTIME")));\n' : ""}
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
  const evm = selection.path === "evm_partner_adapter" || selection.capabilities.includes("evm_partner_adapter");
  const onchain = selection.path === "onchain_protocol_gate"
    || selection.capabilities.includes("onchain_protocol_gate")
    || selection.platform === "evm_contract"
    || selection.platform === "solana_program";
  const solanaOnchain = selection.path === "solana_onchain_eligibility_gate"
    || selection.capabilities.includes("solana_onchain_eligibility_gate")
    || selection.platform === "solana_program";
  const evmOnchain = selection.path === "evm_onchain_eligibility_gate"
    || selection.capabilities.includes("evm_onchain_eligibility_gate")
    || selection.platform === "evm_contract";
  const eligibility = selection.path === "eligibility_presentation" || selection.capabilities.includes("eligibility_presentation");
  const crossChain = selection.path === "cross_chain_protocol_access" || selection.capabilities.includes("cross_chain_protocol_access");
  const testnetKit = selection.path === "testnet_gate_deployment" || selection.capabilities.includes("testnet_gate_deployment");
  const institutional = selection.path === "institutional_eligibility_gate" || selection.capabilities.includes("institutional_eligibility_gate");
  const include = { webhook, venue, payment, solana, wallet, portable, evm };

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
    if (evm) files.push({ path: "app/api/abraxas/evm-preflight/route.ts", contents: evmPreflight("typescript_nextjs") });
    if (onchain) files.push({ path: "src/lib/onchain-gate.ts", contents: onchainGate() });
    if (solanaOnchain) files.push({ path: "src/lib/solana-onchain-gate.ts", contents: solanaOnchainGate() });
    if (evmOnchain) files.push({ path: "src/lib/evm-onchain-gate.ts", contents: evmOnchainGate() });
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
    if (evm) files.push({ path: "src/evm-preflight.ts", contents: evmPreflight("typescript_express") });
    files.push({ path: "src/server.ts", contents: expressServer({ webhook, venue, payment, portable, evm }) });
    if (solana) files.push({ path: "src/lib/solana-gate.ts", contents: solanaGate() });
    if (onchain) files.push({ path: "src/lib/onchain-gate.ts", contents: onchainGate() });
    if (solanaOnchain) files.push({ path: "src/lib/solana-onchain-gate.ts", contents: solanaOnchainGate() });
    if (evmOnchain) files.push({ path: "src/lib/evm-onchain-gate.ts", contents: evmOnchainGate() });
    if (wallet) files.push({ path: "src/lib/wallet-binding.ts", contents: walletBinding() });
  } else if (selection.runtime === "universal_https") {
    files.push(...universalHttpsFiles(include));
  } else if (selection.runtime === "javascript_wix_velo") {
    files.push(...wixVeloFiles({ webhook, venue, payment, wallet, portable, evm }));
  } else {
    files.push(...serverlessFiles(include));
  }

  if (onchain || solanaOnchain || evmOnchain) {
    if (onchain && !files.some((file) => file.path === "src/lib/onchain-gate.ts")) {
      files.push({ path: "src/lib/onchain-gate.ts", contents: onchainGate() });
    }
    if (solanaOnchain && !files.some((file) => file.path === "src/lib/solana-onchain-gate.ts")) {
      files.push({ path: "src/lib/solana-onchain-gate.ts", contents: solanaOnchainGate() });
    }
    if (evmOnchain && !files.some((file) => file.path === "src/lib/evm-onchain-gate.ts")) {
      files.push({ path: "src/lib/evm-onchain-gate.ts", contents: evmOnchainGate() });
    }
    if (onchain || evmOnchain) files.push({ path: "onchain/EVM_VERIFIER.md", contents: evmVerifierDoc() });
    if (evmOnchain) files.push({ path: "onchain/EVM_PARTNER_GATE.md", contents: evmPartnerGateDoc() });
    if (solanaOnchain || onchain) files.push({ path: "onchain/SOLANA_PROGRAM.md", contents: solanaProgramDoc() });
    files.push({ path: "onchain/deployment-manifest.template.json", contents: deploymentManifestTemplate() });
    files.push({ path: "onchain/SIGNER_LIFECYCLE.md", contents: signerLifecycleDoc() });
  }

  if (eligibility) {
    files.push({ path: "src/lib/eligibility-presentation.ts", contents: eligibilityPresentationServerExample() });
    files.push({ path: "ELIGIBILITY_PRESENTATION.md", contents: eligibilityPresentationHttpsExample() });
  }
  if (crossChain) {
    files.push({ path: "src/lib/cross-chain-protocol-access.ts", contents: crossChainProtocolAccessServerExample() });
    files.push({ path: "CROSS_CHAIN_PROTOCOL_ACCESS.md", contents: crossChainProtocolAccessHttpsExample() });
  }
  if (institutional) {
    files.push({ path: "src/lib/organization-eligibility.ts", contents: organizationEligibilityServerExample() });
    files.push({
      path: "INSTITUTIONAL_ELIGIBILITY.md",
      contents: `# Institutional eligibility gate

Authorized representative consent, then a narrow audience-bound organization or authorized-signer result.
Re-fetch the current public receipt. A wallet-control proof is never KYB. Not Utila, AML/KYT, or custody.
`,
    });
  }
  if (testnetKit) {
    files.push({
      path: "TESTNET_GATE_DEPLOYMENT.md",
      contents: `# Human-operated testnet gate kit

npx tsx scripts/abraxas-gate.ts plan solana
npx tsx scripts/abraxas-gate.ts plan evm
npx tsx scripts/abraxas-gate.ts deploy solana-devnet --confirm
npx tsx scripts/abraxas-gate.ts deploy evm-testnet --confirm

Deploy never runs from Vercel, CI, API routes, or this starter. Copy env names from lib/partner/testnetGateDeploymentKit/.env.example. Not Mainnet, Arc, USDC, or Circle.
`,
    });
  }
  return files;
}
