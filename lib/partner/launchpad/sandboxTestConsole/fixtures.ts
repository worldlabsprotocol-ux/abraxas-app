// FILE: lib/partner/launchpad/sandboxTestConsole/fixtures.ts
// Placeholder-only local fixtures. Never live, never submit to a provider.

import { STARTER_KIT_PLACEHOLDERS } from "@/lib/partner/starterKit/contract";
import {
  SANDBOX_TEST_CONSOLE_PLATFORMS,
  sanitizeSandboxTestCapabilities,
  type SandboxTestConsoleCapability,
} from "./contract";

const P = STARTER_KIT_PLACEHOLDERS;

export interface SandboxTestFixture {
  id: string;
  title: string;
  filename: string;
  capability: SandboxTestConsoleCapability | null;
  contents: string;
}

function envelope(payload: Record<string, unknown>): string {
  return `${JSON.stringify({
    fixture: true,
    live: false,
    submit_to_provider: false,
    platforms: SANDBOX_TEST_CONSOLE_PLATFORMS,
    note: "Local placeholder only. Do not submit this file to Abraxas, Circle, a venue, or a payment processor.",
    ...payload,
  }, null, 2)}\n`;
}

export function buildSandboxTestFixtures(
  capabilities: readonly string[] = [],
): SandboxTestFixture[] {
  const selected = new Set(sanitizeSandboxTestCapabilities(capabilities));
  const fixtures: SandboxTestFixture[] = [
    {
      id: "callback_request",
      title: "Callback request",
      filename: "callback-request.fixture.json",
      capability: null,
      contents: envelope({
        method: "GET",
        url: `${P.callback_url}?receipt_id=YOUR_RECEIPT_ID&decision=approved`,
        query: { receipt_id: "YOUR_RECEIPT_ID", decision: "approved" },
      }),
    },
    {
      id: "receipt_approved",
      title: "Approved receipt verification response",
      filename: "public-receipt-approved.fixture.json",
      capability: null,
      contents: envelope({
        environment: "sandbox",
        decision: "approved",
        currently_valid: true,
        partner_id: P.partner_id,
        policy_id: P.policy_id,
        policy_version: P.policy_version,
      }),
    },
    {
      id: "receipt_denied",
      title: "Denied or expired receipt verification response",
      filename: "public-receipt-denied.fixture.json",
      capability: null,
      contents: envelope({
        environment: "sandbox",
        decision: "denied",
        currently_valid: false,
        partner_id: P.partner_id,
        policy_id: P.policy_id,
        policy_version: P.policy_version,
        outcome: "expired_or_denied",
      }),
    },
  ];

  if (selected.has("webhooks")) {
    fixtures.push({
      id: "webhook_example",
      title: "Signed webhook verification example",
      filename: "webhook-verify.fixture.json",
      capability: "webhooks",
      contents: envelope({
        header: "X-Abraxas-Signature: sha256=YOUR_COMPUTED_HMAC",
        secret: P.webhook_secret,
        body: { event: "receipt.updated", receipt_id: "YOUR_RECEIPT_ID" },
      }),
    });
  }
  if (selected.has("trading_venue")) {
    fixtures.push({
      id: "trading_allow",
      title: "Trading preflight allow-shaped example",
      filename: "trading-preflight-allow.fixture.json",
      capability: "trading_venue",
      contents: envelope({
        allowed: true,
        action_type: "enable_market_access",
        submits_trade: false,
      }),
    });
    fixtures.push({
      id: "trading_deny",
      title: "Trading preflight deny-shaped example",
      filename: "trading-preflight-deny.fixture.json",
      capability: "trading_venue",
      contents: envelope({
        allowed: false,
        action_type: "enable_market_access",
        submits_trade: false,
        reason: "fixture_deny",
      }),
    });
  }
  if (selected.has("payment_authorization")) {
    fixtures.push({
      id: "payment_allow",
      title: "Payment preflight allow-shaped example",
      filename: "payment-preflight-allow.fixture.json",
      capability: "payment_authorization",
      contents: envelope({
        allowed: true,
        action_type: "authorize_checkout",
        moves_funds: false,
        calls_circle: false,
      }),
    });
    fixtures.push({
      id: "payment_deny",
      title: "Payment preflight deny-shaped example",
      filename: "payment-preflight-deny.fixture.json",
      capability: "payment_authorization",
      contents: envelope({
        allowed: false,
        action_type: "authorize_checkout",
        moves_funds: false,
        calls_circle: false,
        reason: "fixture_deny",
      }),
    });
  }
  return fixtures;
}

export function sandboxTestFixtureLeaks(payload: unknown): string[] {
  const blob = JSON.stringify(payload ?? null).toLowerCase();
  return [
    "abx_test_",
    "abx_live_",
    "eyj",
    "wallet_address",
    "legal_name",
    "date_of_birth",
    "https://abraxasworld.xyz",
    "https://demo.abraxasworld.xyz",
  ].filter((needle) => blob.includes(needle));
}
