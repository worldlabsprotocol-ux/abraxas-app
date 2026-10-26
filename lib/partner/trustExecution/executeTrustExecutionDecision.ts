// FILE: lib/partner/trustExecution/executeTrustExecutionDecision.ts

import { querySovereignStagingPg } from "@/lib/persistence/boundary/sovereignStagingPg";
import { ScopedChallengeStoreUnavailableError } from "@/lib/auth/walletAuthorization/errors";
import { evaluateControlledTestEvidenceGate } from "./controlledTestEvidenceGate";
import type {
  ConsumedTrustAuthorization,
  ExecuteTrustExecutionFailure,
  ExecuteTrustExecutionSuccess,
} from "./trustExecutionTypes";
import { executeTrustExecutionAuthoritativeDecision } from "./executeTrustExecutionAuthoritative";
import { executeTrustExecutionFixtureDecision } from "./executeTrustExecutionFixture.internal";

export async function loadConsumedAuthorization(input: {
  authorizationRef: string;
  partnerId: string;
}): Promise<
  | { ok: true; auth: ConsumedTrustAuthorization }
  | { ok: false; code: string }
> {
  const result = await querySovereignStagingPg<{
    id: string;
    partner_id: string;
    application_id: string;
    policy_id: string;
    policy_version: number;
    correlation_id: string;
    authorization_ref: string | null;
    consumed_at: string | null;
    wallet_address: string;
    subject_pseudonym_id: string | null;
  }>(
    `select id, partner_id, application_id, policy_id, policy_version, correlation_id,
            authorization_ref, consumed_at, wallet_address, subject_pseudonym_id
     from public.wallet_scoped_trust_challenges
     where authorization_ref = $1 and partner_id = $2 and consumed_at is not null
     limit 1`,
    [input.authorizationRef, input.partnerId],
  );
  if ("error" in result) throw new ScopedChallengeStoreUnavailableError(result.error);
  const row = result.rows[0];
  if (!row?.authorization_ref) return { ok: false, code: "authorization_not_found" };
  if (!row.subject_pseudonym_id?.trim()) {
    return { ok: false, code: "subject_binding_missing" };
  }
  return {
    ok: true,
    auth: {
      challenge_id: row.id,
      partner_id: row.partner_id,
      application_id: row.application_id,
      policy_id: row.policy_id,
      policy_version: row.policy_version,
      correlation_id: row.correlation_id,
      wallet_binding_ref: row.authorization_ref,
      wallet_address: row.wallet_address,
      subject_pseudonym_id: row.subject_pseudonym_id,
    },
  };
}

export async function executeTrustExecutionDecision(input: {
  partnerId: string;
  authorizationRef: string;
  controlledTestEvidence?: boolean;
  env?: Record<string, string | undefined>;
}): Promise<ExecuteTrustExecutionSuccess | ExecuteTrustExecutionFailure> {
  const env = input.env ?? process.env;
  const loaded = await loadConsumedAuthorization({
    authorizationRef: input.authorizationRef,
    partnerId: input.partnerId,
  });
  if (!loaded.ok) return { ok: false, code: loaded.code };

  const fixtureRequested = input.controlledTestEvidence === true;
  if (fixtureRequested) {
    const gate = evaluateControlledTestEvidenceGate(env);
    if (!gate.allowed) {
      return { ok: false, code: gate.code, decision_result: "denied" };
    }
    const fixture = await executeTrustExecutionFixtureDecision({
      auth: loaded.auth,
      partnerId: input.partnerId,
      env,
    });
    if (!fixture.ok) return fixture;
    return {
      ok: true,
      receipt: fixture.receipt,
      decision_result: "approved",
      evidence_mode: "controlled_test_evidence",
      verification_material: fixture.verification_material,
      outcome_created: fixture.outcome_created,
    };
  }

  const authoritative = await executeTrustExecutionAuthoritativeDecision({
    auth: loaded.auth,
    partnerId: input.partnerId,
    env,
  });
  if (!authoritative.ok) return authoritative;
  return {
    ok: true,
    receipt: authoritative.receipt,
    decision_result: "approved",
    evidence_mode: "live_authoritative_evidence",
    verification_material: authoritative.verification_material,
    outcome_created: authoritative.outcome_created,
  };
}
