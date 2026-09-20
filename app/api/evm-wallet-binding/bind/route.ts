// FILE: app/api/evm-wallet-binding/bind/route.ts
// Verify an EIP-191 personal_sign proof. Return an opaque binding ref only.

import { NextRequest, NextResponse } from "next/server";
import { bindEvmWalletControl } from "@/lib/partner/evmWalletBinding/bind";
import {
  assertNoSensitiveEvmWalletClientKeys,
  rejectEvmWalletClientOverride,
} from "@/lib/partner/evmWalletBinding/safety";
import { isEvmActionScope, isEvmActionType } from "@/lib/partner/evm/adapter";
import { resolvePartnerConsoleSession } from "@/lib/partner/launchpad/partnerConsoleSession";
import { getNetworkCapability } from "@/lib/partner/networkCapability/registry";

export const dynamic = "force-dynamic";

const ALLOWED = ["origin", "challenge_id", "message", "signature", "contract"] as const;

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (rejectEvmWalletClientOverride(body, ALLOWED)) {
    return NextResponse.json({ ok: false, status: "invalid", binding_ref: null, expires_at: null }, { status: 400 });
  }
  const contract = body.contract && typeof body.contract === "object" && !Array.isArray(body.contract)
    ? body.contract as Record<string, unknown>
    : {};
  const origin = String(body.origin ?? req.headers.get("origin") ?? "").trim();
  const session = await resolvePartnerConsoleSession(req);
  const partnerId = session?.partnerId ?? String(contract.partner_id ?? "");
  if (session && String(contract.partner_id ?? partnerId) !== session.partnerId) {
    return NextResponse.json({ ok: false, status: "invalid", binding_ref: null, expires_at: null }, { status: 400 });
  }
  const actionType = String(contract.action_type ?? "");
  const actionScope = String(contract.action_scope ?? "");
  const networkId = typeof contract.network_context === "object" && contract.network_context
    ? String((contract.network_context as Record<string, unknown>).network_id ?? "")
    : "";
  if (!isEvmActionType(actionType) || !isEvmActionScope(actionScope) || !getNetworkCapability(networkId)) {
    return NextResponse.json({ ok: false, status: "invalid", binding_ref: null, expires_at: null }, { status: 400 });
  }
  const bound = await bindEvmWalletControl({
    challengeId: String(body.challenge_id ?? ""),
    origin,
    partnerId,
    policyId: String(contract.policy_id ?? ""),
    policyVersion: Number(contract.policy_version ?? 0),
    actionType,
    actionScope,
    networkId,
    actionContractNonce: String(contract.nonce ?? ""),
    message: String(body.message ?? ""),
    signature: String(body.signature ?? ""),
  });
  const visible = {
    ok: bound.ok,
    status: bound.status,
    binding_ref: bound.binding_ref,
    expires_at: bound.expires_at,
  };
  if (assertNoSensitiveEvmWalletClientKeys(visible).length > 0) {
    return NextResponse.json({ ok: false, status: "invalid", binding_ref: null, expires_at: null }, { status: 503 });
  }
  const status = bound.status === "store_unavailable" ? 503 : bound.ok ? 200 : 400;
  return NextResponse.json(visible, { status });
}
