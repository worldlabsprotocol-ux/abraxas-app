// FILE: app/api/launchpad/applications/[id]/sovereign-trust-execution/route.ts
// Partner Launchpad session bridge to wallet-scoped trust execution (#855).

import { NextRequest } from "next/server";
import {
  enforceLaunchpadTenantRateLimit,
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication.server";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import { getPublicAppOriginFromRequest } from "@/lib/app/publicAppOrigin";
import {
  executePartnerTrustExecutionJourney,
  loadPartnerTrustExecutionJourney,
  startPartnerTrustExecutionJourney,
} from "@/lib/partner/trustExecution/partnerTrustExecutionJourney";
import { ScopedChallengeStoreUnavailableError } from "@/lib/auth/walletAuthorization/errors";
import { verifyTrustExecutionMaterial, buildDemoTrustAnchorFromEnv } from "@/lib/partner/trustExecution/verifyTrustExecutionMaterial";
import type { PartnerTrustExecutionJourneyView } from "@/lib/partner/trustExecution/partnerTrustExecutionJourney";

export const dynamic = "force-dynamic";
type RouteContext = { params: { id: string } };

function sanitizeJourneyForPartner(journey: PartnerTrustExecutionJourneyView) {
  return {
    phase: journey.phase,
    challenge_id: journey.challenge_id,
    correlation_id: journey.correlation_id,
    application_id: journey.application_id,
    policy_id: journey.policy_id,
    policy_version: journey.policy_version,
    action: journey.action,
    expires_at: journey.expires_at,
    holder_wallet_address: journey.holder_wallet_address,
    authorization_ref: journey.authorization_ref,
    receipt_id: journey.receipt_id,
    decision_result: journey.decision_result,
    evidence_mode: journey.evidence_mode,
    holder_url: journey.holder_url,
    independent_verification_material: journey.independent_verification_material,
    independent_verification_note:
      "Portable verification material is for your relying party to verify locally against your own pinned trust anchor. Launchpad never substitutes server env configuration for external pinning.",
  };
}

const LAUNCHPAD_ILLUSTRATIVE_VERIFICATION_DISCLAIMER =
  "Illustrative only: computed with Abraxas demo environment anchor for integration smoke checks. External relying parties must verify portable material against their own pinned trust anchor.";

function wrapIllustrativeIndependentVerification(
  result: ReturnType<typeof verifyTrustExecutionMaterial>,
): Record<string, unknown> {
  return {
    scope: "illustrative_launchpad_demo",
    disclaimer: LAUNCHPAD_ILLUSTRATIVE_VERIFICATION_DISCLAIMER,
    result,
  };
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const limited = await enforceLaunchpadTenantRateLimit(
    req,
    "/api/launchpad/sovereign-trust-execution",
    auth.session.partnerId,
    60,
  );
  if (limited) return limited;

  const challengeId = req.nextUrl.searchParams.get("challenge_id")?.trim() ?? "";
  if (!challengeId) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "challenge_id_required");
  }

  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);

  try {
    const loaded = await loadPartnerTrustExecutionJourney({
      partnerId: auth.session.partnerId,
      applicationId: params.id,
      challengeId,
    });
    if (!loaded.ok) {
      const status =
        loaded.code === "tenant_mismatch" || loaded.code === "application_mismatch" ? 403 : 404;
      return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, status, loaded.code);
    }
    return launchpadJson({ ok: true, journey: sanitizeJourneyForPartner(loaded.journey) });
  } catch (error) {
    if (error instanceof ScopedChallengeStoreUnavailableError) {
      return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.not_configured, 503, error.code);
    }
    throw error;
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const limited = await enforceLaunchpadTenantRateLimit(
    req,
    "/api/launchpad/sovereign-trust-execution",
    auth.session.partnerId,
    30,
  );
  if (limited) return limited;

  let body: {
    holder_wallet_address?: string;
    solana_network?: string;
    correlation_id?: string;
    execute?: boolean;
    challenge_id?: string;
  };
  try {
    body = await req.json();
  } catch {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400);
  }

  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);
  if (app.environment === "production") {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.forbidden, 403, "production_denied");
  }

  const origin = getPublicAppOriginFromRequest(req);

  try {
    if (body.execute === true) {
      const challengeId = String(body.challenge_id ?? "").trim();
      if (!challengeId) {
        return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "challenge_id_required");
      }
      const executed = await executePartnerTrustExecutionJourney({
        partnerId: auth.session.partnerId,
        applicationId: params.id,
        challengeId,
      });
      if (!executed.ok) {
        const status =
          executed.code === "awaiting_holder_authorization" ? 409
          : executed.code === "expired" ? 410
          : executed.code === "application_mismatch" ? 403
          : executed.decision_result === "indeterminate" ? 503
          : 403;
        return launchpadJson(
          { ok: false, code: executed.code, decision_result: executed.decision_result ?? null },
          status,
        );
      }

      let independent_verification: unknown = null;
      const material = executed.journey.independent_verification_material;
      const anchor = buildDemoTrustAnchorFromEnv(process.env);
      if (material && anchor) {
        independent_verification = wrapIllustrativeIndependentVerification(
          verifyTrustExecutionMaterial({
            material,
            pinnedTrustAnchor: anchor,
            partnerId: auth.session.partnerId,
            policyId: executed.journey.policy_id,
          }),
        );
      }

      return launchpadJson({
        ok: true,
        journey: sanitizeJourneyForPartner(executed.journey),
        independent_verification,
        independent_verification_disclaimer: LAUNCHPAD_ILLUSTRATIVE_VERIFICATION_DISCLAIMER,
      });
    }

    const wallet = String(body.holder_wallet_address ?? "").trim();
    if (!wallet) {
      return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "holder_wallet_required");
    }

    const started = await startPartnerTrustExecutionJourney({
      partnerId: auth.session.partnerId,
      applicationId: params.id,
      holderWalletAddress: wallet,
      origin,
      uri: `${origin}/api/launchpad/applications/${params.id}/sovereign-trust-execution`,
      solanaNetwork: String(body.solana_network ?? "devnet"),
      correlationId: body.correlation_id,
    });
    if (!started.ok) {
      return launchpadJson({ ok: false, code: started.code }, started.code === "application_scope_invalid" ? 403 : 400);
    }

    return launchpadJson({ ok: true, journey: sanitizeJourneyForPartner(started.journey) });
  } catch (error) {
    if (error instanceof ScopedChallengeStoreUnavailableError) {
      return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.not_configured, 503, error.code);
    }
    throw error;
  }
}
