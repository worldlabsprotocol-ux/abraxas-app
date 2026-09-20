// FILE: app/api/evm-wallet-binding/challenge/route.ts
// Issue a domain-bound EVM action challenge. Partner backend only. No address.

import { NextRequest, NextResponse } from "next/server";
import { issueEvmWalletChallenge } from "@/lib/partner/evmWalletBinding/challenge";
import {
  assertNoSensitiveEvmWalletClientKeys,
  rejectEvmWalletClientOverride,
} from "@/lib/partner/evmWalletBinding/safety";
import { isEvmActionScope, isEvmActionType } from "@/lib/partner/evm/adapter";
import { resolvePartnerConsoleSession } from "@/lib/partner/launchpad/partnerConsoleSession";
import { getNetworkCapability } from "@/lib/partner/networkCapability/registry";

export const dynamic = "force-dynamic";

const ALLOWED = ["origin", "contract"] as const;

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
  const issued = await issueEvmWalletChallenge({
    origin,
    partnerId,
    policyId: String(contract.policy_id ?? ""),
    policyVersion: Number(contract.policy_version ?? 0),
    actionType,
    actionScope,
    networkId,
    actionContractNonce: String(contract.nonce ?? ""),
  });
  if ("ok" in issued) {
    const status = issued.status === "store_unavailable" ? 503 : 400;
    return NextResponse.json({ ok: false, status: issued.status, binding_ref: null, expires_at: null }, { status });
  }
  if (assertNoSensitiveEvmWalletClientKeys(issued).length > 0) {
    return NextResponse.json({ ok: false, status: "invalid", binding_ref: null, expires_at: null }, { status: 503 });
  }
  return NextResponse.json(issued);
}
