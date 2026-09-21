// FILE: app/api/v1/chain-attestations/route.ts
// Partner-backend EIP-712/Solana eligibility attestation issuance. No browser authority.

import { NextRequest, NextResponse } from "next/server";
import { authenticatePartner } from "@/lib/partner/partnerAuth";
import { AbraxasPartnerKit } from "@/lib/partner/integrationKit";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { issueChainEligibilityAttestation } from "@/lib/partner/chainAttestation/issue";
import { parseChainAttestationRequest } from "@/lib/partner/chainAttestation/parseRequest";
import { chainAttestationHasForbiddenKeys } from "@/lib/partner/chainAttestation/project";
import { CHAIN_ATTESTATION_NOT_EXECUTION } from "@/lib/partner/chainAttestation/contract";

export const dynamic = "force-dynamic";

function fail(reason: string, status: number) {
  return NextResponse.json({
    allowed: false,
    reason,
    action_binding: {
      action_type: "rejected",
      action_scope: "rejected",
      nonce_state: "rejected",
      wallet_binding: "not_attached",
    },
    expires_at: null,
    schema_version: 2,
    network_id: null,
    environment: null,
    notice: CHAIN_ATTESTATION_NOT_EXECUTION,
  }, { status });
}

export async function POST(req: NextRequest) {
  const auth = await authenticatePartner(req, "verify:requests");
  if (!auth) return fail("unauthorized", 401);
  if (!auth.ok) return fail("unauthorized", auth.status);

  let json: unknown = {};
  try {
    json = await req.json();
  } catch {
    return fail("invalid", 400);
  }
  const parsed = parseChainAttestationRequest(json);
  if (!parsed.ok) return fail("invalid", 400);

  const appId = parsed.value.application_id
    ?? req.headers.get("x-abraxas-application-id")?.trim()
    ?? "";
  if (!appId) return fail("invalid", 400);
  let app;
  try {
    app = await getLaunchpadApplicationForPartner(appId, auth.ctx.partnerId);
  } catch {
    return fail("store_unavailable", 503);
  }
  if (!app || app.partner_id !== auth.ctx.partnerId) return fail("unauthorized", 403);

  const kit = new AbraxasPartnerKit({
    partnerId: app.partner_id,
    policyId: app.policy_id,
    policyVersion: app.policy_version,
    requirePolicyVersion: true,
    environment: app.environment,
  });

  const issued = await issueChainEligibilityAttestation({
    kit,
    receiptId: parsed.value.receipt_id,
    action_type: parsed.value.action_type,
    action_scope: parsed.value.action_scope,
    network_id: parsed.value.network_id,
    deployment_ref: parsed.value.deployment_ref,
    application_id: appId,
    wallet_binding_hash: parsed.value.wallet_binding_hash,
    wallet_binding_mode: parsed.value.wallet_binding_mode,
  });

  if (!issued.ok) {
    const body = { ...issued.client, notice: CHAIN_ATTESTATION_NOT_EXECUTION };
    if (chainAttestationHasForbiddenKeys(body).length) return fail("invalid", 500);
    return NextResponse.json(body, { status: issued.reason === "unauthorized" ? 401 : 403 });
  }

  const partnerBody = {
    ...issued.client,
    allowed: true,
    attestation_id: issued.attestation_id,
    encoding: issued.encoding,
    typed_data: issued.typed_data ?? null,
    signature: issued.signature ?? null,
    solana_message: issued.solana_message ?? null,
    notice: CHAIN_ATTESTATION_NOT_EXECUTION,
  };
  if (chainAttestationHasForbiddenKeys(partnerBody).length) return fail("invalid", 500);
  return NextResponse.json(partnerBody);
}
