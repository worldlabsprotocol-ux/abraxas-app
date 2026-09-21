// FILE: app/api/launchpad/applications/[id]/chain-attestation/route.ts
// Launchpad sandbox-session issuance. Tenant bound. Browser cannot set signer/partner/policy/env.

import { NextRequest } from "next/server";
import {
  enforceLaunchpadTenantRateLimit,
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import { AbraxasPartnerKit } from "@/lib/partner/integrationKit";
import { issueChainEligibilityAttestation } from "@/lib/partner/chainAttestation/issue";
import { parseChainAttestationRequest } from "@/lib/partner/chainAttestation/parseRequest";
import { projectChainAttestationClient, chainAttestationHasForbiddenKeys } from "@/lib/partner/chainAttestation/project";
import { CHAIN_ATTESTATION_NOT_EXECUTION } from "@/lib/partner/chainAttestation/contract";

export const dynamic = "force-dynamic";
type RouteContext = { params: { id: string } };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const limited = enforceLaunchpadTenantRateLimit(req, "/api/launchpad/chain-attestation", auth.session.partnerId, 10);
  if (limited) return limited;

  let json: unknown = {};
  try {
    const text = await req.text();
    if (text) json = JSON.parse(text);
  } catch {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400);
  }
  const parsed = parseChainAttestationRequest(json);
  if (!parsed.ok) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400);
  if (parsed.value.application_id && parsed.value.application_id !== params.id) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.forbidden, 403);
  }

  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);
  if (app.environment !== "sandbox") {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "sandbox_only");
  }

  const kit = new AbraxasPartnerKit({
    partnerId: app.partner_id,
    policyId: app.policy_id,
    policyVersion: app.policy_version,
    requirePolicyVersion: true,
    environment: "sandbox",
  });

  const issued = await issueChainEligibilityAttestation({
    kit,
    receiptId: parsed.value.receipt_id,
    action_type: parsed.value.action_type,
    action_scope: parsed.value.action_scope,
    network_id: parsed.value.network_id,
    chainId: parsed.value.chain_id,
    verifyingContract: parsed.value.verifying_contract,
    wallet_binding_hash: parsed.value.wallet_binding_hash,
    wallet_binding_mode: parsed.value.wallet_binding_mode,
  });

  const view = projectChainAttestationClient(issued.ok ? issued.client : issued.client);
  const body = { ok: issued.ok, ...view, notice: CHAIN_ATTESTATION_NOT_EXECUTION };
  if (chainAttestationHasForbiddenKeys(body).length) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 503, "redacted");
  }
  return launchpadJson(body, issued.ok ? 200 : 403);
}
