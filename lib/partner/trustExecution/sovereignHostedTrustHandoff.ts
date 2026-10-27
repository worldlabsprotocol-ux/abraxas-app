// FILE: lib/partner/trustExecution/sovereignHostedTrustHandoff.ts
// Launchpad hosted handoff on sovereign PostgreSQL — binds to scoped trust execution challenge.

import { getPublicAppOrigin } from "@/lib/app/publicAppOrigin";
import { startPartnerTrustExecutionJourney } from "./partnerTrustExecutionJourney";

export type SovereignHostedTrustHandoffView = {
  handoff_ref: string;
  verify_request: string;
  hosted_url: string;
  challenge_id: string;
  correlation_id: string;
  expires_at: string;
  policy_id: string;
  policy_version: number;
  notice: string;
};

export async function createSovereignHostedTrustHandoff(input: {
  partnerId: string;
  applicationId: string;
  holderWalletAddress: string;
  origin: string;
  solanaNetwork: string;
  correlationId?: string;
}): Promise<
  | { ok: true; handoff: SovereignHostedTrustHandoffView }
  | { ok: false; code: string }
> {
  const uri = `${input.origin}/api/launchpad/applications/${input.applicationId}/sovereign-trust-execution`;
  const started = await startPartnerTrustExecutionJourney({
    partnerId: input.partnerId,
    applicationId: input.applicationId,
    holderWalletAddress: input.holderWalletAddress,
    origin: input.origin,
    uri,
    solanaNetwork: input.solanaNetwork,
    correlationId: input.correlationId,
  });
  if (!started.ok) return started;

  const challengeId = started.journey.challenge_id;
  const hostedPath = `/partner/trust-execution?challenge_id=${encodeURIComponent(challengeId)}`;
  const hostedUrl = `${getPublicAppOrigin()}${hostedPath}`;

  return {
    ok: true,
    handoff: {
      handoff_ref: challengeId,
      verify_request: challengeId,
      hosted_url: hostedUrl,
      challenge_id: challengeId,
      correlation_id: started.journey.correlation_id,
      expires_at: started.journey.expires_at,
      policy_id: started.journey.policy_id,
      policy_version: started.journey.policy_version,
      notice:
        "Hosted handoff binds to one application-scoped trust challenge. Holder wallet authorization continues authoritative evaluation; approval is not eligibility.",
    },
  };
}
