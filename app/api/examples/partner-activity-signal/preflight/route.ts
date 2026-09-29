// FILE: app/api/examples/partner-activity-signal/preflight/route.ts
// Sandbox activity-signal preflight. Fixtures only. Allow/deny surface only.

import { NextRequest, NextResponse } from "next/server";
import {
  AbraxasPartnerActivitySignalAdapter,
  ACTIVITY_FIXTURE_PAYLOAD_HASH,
  PARTNER_ACTIVITY_NO_RAW_DATA,
  PARTNER_ACTIVITY_NOT_ELIGIBILITY,
  PARTNER_ACTIVITY_SIGNAL_TYPES,
  assertNoSensitiveActivityClientKeys,
  isActivityFixtureId,
  activityFixtureReceipt,
  ACTIVITY_REF_PARTNER_ID,
  ACTIVITY_REF_POLICY_ID,
} from "@/lib/partner/partnerActivitySignal";
import { rejectPartnerActivityClientOverride } from "@/lib/partner/partnerActivitySignal/contract";

export const dynamic = "force-dynamic";

function client() {
  return new AbraxasPartnerActivitySignalAdapter({
    partnerId: ACTIVITY_REF_PARTNER_ID,
    policyId: ACTIVITY_REF_POLICY_ID,
    policyVersion: 1,
    environment: "sandbox",
    allowedCategories: [...PARTNER_ACTIVITY_SIGNAL_TYPES],
    purpose: "Confirm one named market-access decision",
    actionScope: "sandbox:market_access",
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (rejectPartnerActivityClientOverride(body)) {
    return NextResponse.json({
      allowed: false,
      reason: "invalid",
      activity_binding: {
        activity_signal_type: "rejected",
        action_scope: "sandbox:market_access",
        nonce_state: "rejected",
        receipt_bound: false,
      },
      expires_at: null,
    }, { status: 400 });
  }

  const fixtureId = String(body.fixture ?? "");
  if (!isActivityFixtureId(fixtureId)) {
    return NextResponse.json({
      allowed: false,
      reason: "invalid",
      activity_binding: {
        activity_signal_type: "rejected",
        action_scope: "sandbox:market_access",
        nonce_state: "rejected",
        receipt_bound: false,
      },
      expires_at: null,
    }, { status: 400 });
  }

  const adapter = client();
  const result = adapter.evaluateFetchedReceipt(activityFixtureReceipt(fixtureId));
  const signal = body.signal ?? {
    type: "repeat_participant",
    source: "partner_records",
    consent_recorded: true,
  };
  const binding = adapter.issueActivityBinding({
    receipt_id: result.receipt_id!,
    receipt_payload_hash: ACTIVITY_FIXTURE_PAYLOAD_HASH,
    activity_signal_type: typeof signal === "object" && signal && "type" in (signal as Record<string, unknown>)
      ? String((signal as Record<string, unknown>).type)
      : "repeat_participant",
  });
  if ("ok" in binding) {
    return NextResponse.json({
      allowed: false,
      reason: binding.reason,
      activity_binding: {
        activity_signal_type: "rejected",
        action_scope: "sandbox:market_access",
        nonce_state: "rejected",
        receipt_bound: false,
      },
      expires_at: null,
    }, { status: 400 });
  }

  const first = await adapter.preflight({
    result,
    receipt_payload_hash: ACTIVITY_FIXTURE_PAYLOAD_HASH,
    signal,
    binding,
  });
  const visible = body.replay_binding
    ? await adapter.preflight({
      result,
      receipt_payload_hash: ACTIVITY_FIXTURE_PAYLOAD_HASH,
      signal,
      binding,
    })
    : first;
  if (assertNoSensitiveActivityClientKeys(visible).length > 0) {
    return NextResponse.json({
      allowed: false,
      reason: "invalid",
      activity_binding: {
        activity_signal_type: "rejected",
        action_scope: "sandbox:market_access",
        nonce_state: "rejected",
        receipt_bound: false,
      },
      expires_at: null,
    }, { status: 500 });
  }
  return NextResponse.json(visible, { status: visible.allowed ? 200 : 403 });
}

export async function GET() {
  const adapter = client();
  return NextResponse.json({
    start_url: adapter.startPolicyVerification("https://abraxasworld.xyz/examples/partner-activity-signal"),
    categories: PARTNER_ACTIVITY_SIGNAL_TYPES,
    requires_wallet: adapter.connectsWallet,
    requires_zklogin: adapter.requiresZkLogin,
    requires_api_keys: adapter.requiresApiKeys,
    boundary: PARTNER_ACTIVITY_NO_RAW_DATA,
    product: PARTNER_ACTIVITY_NOT_ELIGIBILITY,
  });
}
