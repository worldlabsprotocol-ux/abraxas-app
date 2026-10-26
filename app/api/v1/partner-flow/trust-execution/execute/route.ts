// FILE: app/api/v1/partner-flow/trust-execution/execute/route.ts

import { NextRequest, NextResponse } from "next/server";
import { authenticatePartnerScoped } from "@/lib/partner/partnerAuth";
import {
  getLaunchpadApplicationById,
  getLaunchpadApplicationForPartner,
} from "@/lib/partner/launchpad/resolveLaunchpadApplication.server";
import { executeTrustExecutionDecision } from "@/lib/partner/trustExecution/executeTrustExecutionDecision";
import { ScopedChallengeStoreUnavailableError } from "@/lib/auth/walletAuthorization/errors";
import { resolveTrustExecutionEvidenceMode } from "@/lib/partner/trustExecution/controlledTestEvidenceGate";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const applicationId = req.headers.get("x-abraxas-application-id")?.trim() ?? "";
  if (!applicationId) {
    return NextResponse.json({ ok: false, code: "app_required" }, { status: 400 });
  }

  let body: { authorization_ref?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: "invalid_input" }, { status: 400 });
  }

  const authorizationRef = String(body.authorization_ref ?? "").trim();
  if (!authorizationRef) {
    return NextResponse.json({ ok: false, code: "authorization_ref_required" }, { status: 400 });
  }

  const appPreview = await getLaunchpadApplicationById(applicationId);
  if (!appPreview) {
    return NextResponse.json({ ok: false, code: "application_not_found" }, { status: 404 });
  }

  const auth = await authenticatePartnerScoped(req, "verify:requests", {
    requiredApplicationId: applicationId,
    knownApplicationPartnerId: appPreview.partner_id,
    requiredCredentialEnvironment: appPreview.environment === "production" ? "production" : "sandbox",
    requireProductionActive: appPreview.environment === "production",
  });
  if (!auth.ok) {
    return NextResponse.json({ ok: false, code: "unauthorized" }, { status: auth.status });
  }

  const app = await getLaunchpadApplicationForPartner(applicationId, auth.ctx.partnerId);
  if (!app) {
    return NextResponse.json({ ok: false, code: "application_not_found" }, { status: 404 });
  }

  const evidenceMode = resolveTrustExecutionEvidenceMode(process.env);
  const controlledTestEvidence = evidenceMode === "controlled_test_evidence";

  try {
    const executed = await executeTrustExecutionDecision({
      partnerId: auth.ctx.partnerId,
      authorizationRef,
      controlledTestEvidence,
    });
    if (!executed.ok) {
      return NextResponse.json(
        {
          ok: false,
          code: executed.code,
          decision_result: executed.decision_result ?? "denied",
        },
        { status: executed.decision_result === "indeterminate" ? 503 : 403 },
      );
    }

    return NextResponse.json({
      ok: true,
      decision_result: executed.decision_result,
      receipt_id: executed.receipt.id,
      wallet_binding_ref: executed.receipt.wallet_binding_ref,
      evidence_mode: executed.evidence_mode,
      independent_verification_material: {
        portable_receipt: executed.verification_material.portable_receipt,
        signed_issuer_authority: executed.verification_material.signed_issuer_authority,
        signed_status_statement: executed.verification_material.signed_status_statement,
      },
      relying_party_note:
        "Verify the portable receipt with your pinned trust anchor and signed status; Abraxas does not assert currently_acceptable on this response.",
    });
  } catch (error) {
    if (error instanceof ScopedChallengeStoreUnavailableError) {
      return NextResponse.json({ ok: false, code: error.code }, { status: 503 });
    }
    throw error;
  }
}
