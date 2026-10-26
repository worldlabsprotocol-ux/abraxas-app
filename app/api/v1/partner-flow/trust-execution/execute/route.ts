// FILE: app/api/v1/partner-flow/trust-execution/execute/route.ts

import { NextRequest, NextResponse } from "next/server";
import { authenticatePartnerScoped } from "@/lib/partner/partnerAuth";
import {
  getLaunchpadApplicationById,
  getLaunchpadApplicationForPartner,
} from "@/lib/partner/launchpad/resolveLaunchpadApplication.server";
import { executeTrustExecutionDecision } from "@/lib/partner/trustExecution/executeTrustExecutionDecision";
import { ScopedChallengeStoreUnavailableError } from "@/lib/auth/walletAuthorization/errors";
import { toIndependentVerifierRecord } from "@/lib/decisionReceipts/independentVerifierBridge";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const applicationId = req.headers.get("x-abraxas-application-id")?.trim() ?? "";
  if (!applicationId) {
    return NextResponse.json({ ok: false, code: "app_required" }, { status: 400 });
  }

  let body: { authorization_ref?: string; subject_pseudonym_seed?: string };
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

  const controlledTestEvidence = process.env.ABRAXAS_TRUST_EXECUTION_CONTROLLED_TEST_EVIDENCE === "1";

  try {
    const executed = await executeTrustExecutionDecision({
      partnerId: auth.ctx.partnerId,
      authorizationRef,
      subjectPseudonymSeed: String(body.subject_pseudonym_seed ?? authorizationRef),
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
      portable_verification: {
        record: toIndependentVerifierRecord(executed.receipt),
        currently_acceptable: executed.independent_verification.currently_acceptable,
        cryptographically_authentic: executed.independent_verification.cryptographically_authentic,
        failure_codes: executed.independent_verification.failure_codes,
      },
      evidence_mode: controlledTestEvidence ? "controlled_test_evidence" : "live_authoritative_evidence",
    });
  } catch (error) {
    if (error instanceof ScopedChallengeStoreUnavailableError) {
      return NextResponse.json({ ok: false, code: error.code }, { status: 503 });
    }
    throw error;
  }
}
