// FILE: lib/partner/trustExecution/partnerTrustExecutionJourney.ts
// Unified partner ↔ holder ↔ execute status for wallet-scoped trust execution (#855).

import { querySovereignStagingPg } from "@/lib/persistence/boundary/sovereignStagingPg";
import { ScopedChallengeStoreUnavailableError } from "@/lib/auth/walletAuthorization/errors";
import { loadScopedTrustChallenge } from "@/lib/auth/walletAuthorization/scopedChallengePostgresStore";
import { getPublicAppOrigin } from "@/lib/app/publicAppOrigin";
import {
  issuePartnerTrustExecutionChallenge,
  resolvePartnerApplicationScope,
} from "./partnerTrustExecutionService";
import { executeTrustExecutionDecision } from "./executeTrustExecutionDecision";
import { resolveTrustExecutionEvidenceMode } from "./controlledTestEvidenceGate";
import type { TrustExecutionVerificationMaterial } from "./trustExecutionTypes";
import { PARTNER_TRUST_EXECUTION_ACTION } from "./constants";

export type PartnerTrustExecutionJourneyPhase =
  | "awaiting_holder_authorization"
  | "authorized_pending_execution"
  | "executed"
  | "expired"
  | "failed";

export type PartnerTrustExecutionJourneyView = {
  phase: PartnerTrustExecutionJourneyPhase;
  challenge_id: string;
  correlation_id: string;
  application_id: string;
  partner_id: string;
  policy_id: string;
  policy_version: number;
  action: string;
  expires_at: string;
  holder_wallet_address: string;
  authorization_ref: string | null;
  receipt_id: string | null;
  decision_result: string | null;
  evidence_mode: string | null;
  holder_url: string;
  failure_code: string | null;
  independent_verification_material: TrustExecutionVerificationMaterial | null;
};

function holderUrlForChallenge(challengeId: string): string {
  const origin = getPublicAppOrigin();
  return `${origin}/partner/trust-execution?challenge_id=${encodeURIComponent(challengeId)}`;
}

export async function startPartnerTrustExecutionJourney(input: {
  partnerId: string;
  applicationId: string;
  holderWalletAddress: string;
  origin: string;
  uri: string;
  solanaNetwork: string;
  correlationId?: string;
}): Promise<
  | { ok: true; journey: PartnerTrustExecutionJourneyView }
  | { ok: false; code: string }
> {
  const scope = await resolvePartnerApplicationScope({
    partnerId: input.partnerId,
    applicationId: input.applicationId,
  });
  if (!scope) return { ok: false, code: "application_scope_invalid" };

  const issued = await issuePartnerTrustExecutionChallenge({
    partnerId: input.partnerId,
    applicationId: input.applicationId,
    holderWalletAddress: input.holderWalletAddress,
    origin: input.origin,
    uri: input.uri,
    solanaNetwork: input.solanaNetwork,
    correlationId: input.correlationId,
  });
  if (!issued.ok) return { ok: false, code: issued.code };

  const journey = await loadPartnerTrustExecutionJourney({
    partnerId: input.partnerId,
    challengeId: issued.challenge_id,
  });
  if (!journey.ok) return { ok: false, code: journey.code };
  return { ok: true, journey: journey.journey };
}

export async function loadPartnerTrustExecutionJourney(input: {
  partnerId: string;
  challengeId: string;
}): Promise<
  | { ok: true; journey: PartnerTrustExecutionJourneyView }
  | { ok: false; code: string }
> {
  const row = await loadScopedTrustChallenge(input.challengeId);
  if (!row) return { ok: false, code: "not_found" };
  if (row.partnerId !== input.partnerId) return { ok: false, code: "tenant_mismatch" };

  let phase: PartnerTrustExecutionJourneyPhase = "awaiting_holder_authorization";
  if (row.consumedAt && row.authorizationRef) {
    phase = "authorized_pending_execution";
  } else if (new Date(row.expiresAt) <= new Date()) {
    phase = "expired";
  }

  let receiptId: string | null = null;
  let decisionResult: string | null = null;
  let evidenceMode: string | null = null;
  let verificationMaterial: TrustExecutionVerificationMaterial | null = null;

  if (row.authorizationRef) {
    const outcome = await querySovereignStagingPg<{
      receipt_id: string;
      decision_result: string;
    }>(
      `select receipt_id, decision_result
       from public.wallet_scoped_trust_execution_outcomes
       where authorization_ref = $1 and partner_id = $2
       limit 1`,
      [row.authorizationRef, input.partnerId],
    );
    if ("error" in outcome) throw new ScopedChallengeStoreUnavailableError(outcome.error);
    if (outcome.rows[0]) {
      phase = "executed";
      receiptId = outcome.rows[0].receipt_id;
      decisionResult = outcome.rows[0].decision_result;
    }
  }

  return {
    ok: true,
    journey: {
      phase,
      challenge_id: row.challengeId,
      correlation_id: row.correlationId,
      application_id: row.applicationId ?? "",
      partner_id: row.partnerId,
      policy_id: row.policyId,
      policy_version: row.policyVersion,
      action: row.action || PARTNER_TRUST_EXECUTION_ACTION,
      expires_at: row.expiresAt,
      holder_wallet_address: row.walletAddress,
      authorization_ref: row.authorizationRef,
      receipt_id: receiptId,
      decision_result: decisionResult,
      evidence_mode: evidenceMode,
      holder_url: holderUrlForChallenge(row.challengeId),
      failure_code: null,
      independent_verification_material: verificationMaterial,
    },
  };
}

export async function executePartnerTrustExecutionJourney(input: {
  partnerId: string;
  challengeId: string;
  env?: Record<string, string | undefined>;
}): Promise<
  | { ok: true; journey: PartnerTrustExecutionJourneyView }
  | { ok: false; code: string; decision_result?: string }
> {
  const loaded = await loadPartnerTrustExecutionJourney({
    partnerId: input.partnerId,
    challengeId: input.challengeId,
  });
  if (!loaded.ok) return loaded;
  if (loaded.journey.phase === "expired") {
    return { ok: false, code: "expired", decision_result: "denied" };
  }
  if (!loaded.journey.authorization_ref) {
    return { ok: false, code: "awaiting_holder_authorization" };
  }
  if (loaded.journey.phase === "executed" && loaded.journey.receipt_id) {
    return { ok: true, journey: loaded.journey };
  }

  const env = input.env ?? process.env;
  const evidenceMode = resolveTrustExecutionEvidenceMode(env);
  const executed = await executeTrustExecutionDecision({
    partnerId: input.partnerId,
    authorizationRef: loaded.journey.authorization_ref,
    controlledTestEvidence: evidenceMode === "controlled_test_evidence",
    env,
  });
  if (!executed.ok) {
    return {
      ok: false,
      code: executed.code,
      decision_result: executed.decision_result,
    };
  }

  const refreshed = await loadPartnerTrustExecutionJourney({
    partnerId: input.partnerId,
    challengeId: input.challengeId,
  });
  if (!refreshed.ok) return refreshed;

  return {
    ok: true,
    journey: {
      ...refreshed.journey,
      phase: "executed",
      receipt_id: executed.receipt.id,
      decision_result: executed.decision_result,
      evidence_mode: executed.evidence_mode,
      independent_verification_material: executed.verification_material,
    },
  };
}

export function projectHolderTrustExecutionJourney(
  journey: PartnerTrustExecutionJourneyView,
): {
  application_label: string;
  action_label: string;
  policy_label: string;
  disclosure: string;
  phase: PartnerTrustExecutionJourneyPhase;
  expires_at: string;
} {
  return {
    application_label: journey.application_id,
    action_label: "Authorize trust decision",
    policy_label: `${journey.policy_id} (v${journey.policy_version})`,
    disclosure: "No personal documents are uploaded for this authorization. You approve a narrowly scoped wallet signature.",
    phase: journey.phase,
    expires_at: journey.expires_at,
  };
}
