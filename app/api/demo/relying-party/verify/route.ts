// FILE: app/api/demo/relying-party/verify/route.ts
// Server-side receipt verification for the relying-party pilot demo.

import { NextRequest, NextResponse } from "next/server";
import {
  mergePilotMerchantOverride,
  pilotPayloadLeaks,
  resolveRelyingPartyPilotMerchant,
  verifyPilotPartnerReceipt,
  type RelyingPartyPilotSlot,
} from "@/lib/demo/relyingPartyPilot";

export const dynamic = "force-dynamic";

function slotFrom(value: unknown): RelyingPartyPilotSlot {
  return value === "b" ? "b" : "a";
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const slot = slotFrom(body.slot);
  let merchant = resolveRelyingPartyPilotMerchant(slot);
  if (typeof body.partner_id === "string" || typeof body.policy_id === "string" || typeof body.display_name === "string") {
    merchant = mergePilotMerchantOverride(merchant, {
      partner_id: typeof body.partner_id === "string" ? body.partner_id : undefined,
      policy_id: typeof body.policy_id === "string" ? body.policy_id : undefined,
      display_name: typeof body.display_name === "string" ? body.display_name : undefined,
      app_slug: typeof body.app_slug === "string" ? body.app_slug : undefined,
    });
  }

  const searchParams = body.search_params && typeof body.search_params === "object" && !Array.isArray(body.search_params)
    ? body.search_params as Record<string, string | string[] | undefined>
    : undefined;

  const result = await verifyPilotPartnerReceipt({
    merchant,
    receipt_id: typeof body.receipt_id === "string" ? body.receipt_id : undefined,
    search_params: searchParams,
    allow_sandbox: body.allow_sandbox !== false,
  });

  const response = {
    allowed: result.allowed,
    outcome: result.outcome,
    reason_codes: result.reason_codes,
    checks: result.checks,
    partner_visible: result.partner_visible,
    cryptographically_verified: result.cryptographically_verified,
    receipt: result.receipt,
    merchant: {
      slot: merchant.slot,
      partner_id: merchant.partner_id,
      policy_id: merchant.policy_id,
      display_name: merchant.display_name,
    },
  };

  const leaks = pilotPayloadLeaks(response);
  if (leaks.length > 0) {
    return NextResponse.json({ allowed: false, outcome: "invalid", reason_codes: ["privacy_leak_detected"] }, { status: 500 });
  }

  return NextResponse.json(response, { status: result.allowed ? 200 : 403 });
}
