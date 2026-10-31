// FILE: app/api/launchpad/applications/[id]/receipts/validate/route.ts
// Independent receipt validation for sovereign Launchpad (cryptographic trust, not DB trust root).

import { NextRequest } from "next/server";
import {
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication.server";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import { launchpadUsesSovereignPostgres } from "@/lib/partner/launchpad/launchpadPersistence";
import { evaluatePublicReceiptTrust } from "@/lib/decisionReceipts/trustEvaluation";
import { validatePartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import type { PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;

  const receiptId = req.nextUrl.searchParams.get("receipt_id")?.trim() ?? "";
  if (!receiptId) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "receipt_id required");
  }

  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);
  }

  if (!launchpadUsesSovereignPostgres()) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.not_configured, 501, "Sovereign receipt store required");
  }

  const { pgGetSignedReceiptForApplication } = await import(
    "@/lib/partner/launchpad/sovereign/launchpadPgStore"
  );
  const stored = await pgGetSignedReceiptForApplication({
    applicationId: params.id,
    partnerId: auth.session.partnerId,
    receiptId,
  });
  if (!stored) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 404, "Receipt not found for application");
  }

  const receipt = stored.public_payload as PartnerFlowPublicReceipt;
  const trust = evaluatePublicReceiptTrust(receipt, {
    partnerId: app.partner_id,
    policyId: app.policy_id,
    allowSandbox: app.environment === "sandbox",
  });
  const flow = validatePartnerFlowPublicReceipt(receipt, {
    partnerId: app.partner_id,
    policyId: app.policy_id,
    mode: "sandbox",
    allowSandbox: true,
  });
  const bindingMatches = receipt.receipt_id === stored.receipt_id
    && stored.public_payload.signature === stored.signature
    && stored.public_payload.policy_version === app.policy_version
    && receipt.decision_context === "sandbox_only"
    && app.environment === "sandbox";
  const storageCurrent = !stored.revoked_at
    && Number.isFinite(Date.parse(stored.expires_at))
    && Date.parse(stored.expires_at) > Date.now();

  return launchpadJson({
    ok: true,
    receipt_id: stored.receipt_id,
    signature_valid: trust.signature_valid,
    currently_valid: trust.currently_valid,
    validity: trust.validity,
    invalidation_reasons: trust.invalidation_reasons,
    partner_flow_ok: flow.ok,
    partner_flow_errors: flow.errors,
    harness_verification_ok: trust.signature_valid && trust.currently_valid && flow.ok
      && stored.scenario_id === "approved" && stored.request_status === "completed"
      && stored.idempotency_key?.startsWith(`harness:${app.id}:approved:`) === true
      && bindingMatches && storageCurrent,
    storage_revoked_at: stored.revoked_at,
    expires_at: stored.expires_at,
  });
}

