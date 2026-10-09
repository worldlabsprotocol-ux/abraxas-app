#!/usr/bin/env npx tsx
// FILE: scripts/good-trouble-sandbox-partner-verify-demo.ts
// Repeatable sandbox demo: holder receipt reference → server verifyForAction → Permit/Deny.

import { CANONICAL_SANDBOX_ONLY_INVALIDATION_REASON } from "@abraxas/partner-kit/trust";
import {
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_ID,
} from "@/lib/goodTrouble/canonicalProductionConfig";
import {
  createGoodTroubleProtectedActionStore,
  verifyGoodTroubleSandboxAccess,
} from "@/lib/goodTrouble/sandboxPartnerVerification";

const LIVE_RECEIPT_ID = process.env.GOOD_TROUBLE_RECEIPT_ID?.trim();
const BASE_URL = process.env.ABRAXAS_BASE_URL?.trim();

async function runFixtureDemo() {
  const fixtureReceipt = {
    receipt_id: "dr_gt_demo_fixture",
    schema_version: "1.0.0",
    artifact_type: "eligibility_decision_receipt",
    partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
    policy_id: GOOD_TROUBLE_CANONICAL_POLICY_ID,
    policy_version: 2,
    decision_result: "approved",
    signature_valid: true,
    expires_at: "2099-01-01T00:00:00.000Z",
    status: "active",
    production_usable: false,
    decision_context: "sandbox_only",
    currently_valid: true,
    invalidation_reasons: [CANONICAL_SANDBOX_ONLY_INVALIDATION_REASON],
    lifecycle_status: "active",
  };

  const fetchFn = async (url: string | URL | Request) => {
    if (String(url).includes("/public")) {
      return new Response(JSON.stringify(fixtureReceipt), { status: 200 });
    }
    return new Response("{}", { status: 404 });
  };

  const protectedStore = createGoodTroubleProtectedActionStore();
  const callback = new URLSearchParams({
    gtv: "gtf_demo_fixture_only",
    receipt_id: fixtureReceipt.receipt_id,
    status: "approved",
  });

  const permit = await verifyGoodTroubleSandboxAccess({
    search: callback,
    fetchFn: fetchFn as typeof fetch,
    protectedActionKey: "demo:checkout",
    protectedActionStore: protectedStore,
  });

  const denyMissing = await verifyGoodTroubleSandboxAccess({
    search: new URLSearchParams({ receipt_id: "dr_missing" }),
    fetchFn: async () => new Response("{}", { status: 404 }) as Response,
  });

  console.log(JSON.stringify({
    label: "good_trouble_sandbox_partner_verify_demo",
    mode: "fixture",
    steps: [
      "Seeker holder completes Share → receipt_id returned on callback",
      "Partner backend verifyGoodTroubleSandboxAccess (mocked public receipt fetch)",
      "Protected action idempotency simulates one-time checkout grant",
    ],
    permit: {
      action: permit.action,
      outcome: permit.outcome,
      receipt_id: permit.receipt_id,
    },
    deny_missing_receipt: {
      action: denyMissing.action,
      outcome: denyMissing.outcome,
      errors: denyMissing.errors,
    },
    note: "Fixture only — not a live Good Trouble backend connection.",
  }, null, 2));
}

async function runLiveReceiptDemo() {
  if (!LIVE_RECEIPT_ID) return;
  const result = await verifyGoodTroubleSandboxAccess({
    search: new URLSearchParams({ receipt_id: LIVE_RECEIPT_ID }),
    baseUrl: BASE_URL,
  });
  console.log(JSON.stringify({
    label: "good_trouble_sandbox_partner_verify_demo",
    mode: "live_public_receipt",
    base_url: BASE_URL ?? "(default site url)",
    receipt_id: LIVE_RECEIPT_ID,
    action: result.action,
    outcome: result.outcome,
    errors: result.errors,
    note: "Fetched public receipt from Abraxas — partner authorization still requires permit outcome.",
  }, null, 2));
}

async function main() {
  await runFixtureDemo();
  await runLiveReceiptDemo();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
