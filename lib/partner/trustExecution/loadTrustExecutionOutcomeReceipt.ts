// FILE: lib/partner/trustExecution/loadTrustExecutionOutcomeReceipt.ts

import type { DecisionReceiptRecord, EvaluatedClaimRef } from "@/lib/decisionReceipts/types";
import { mapReceiptRow } from "@/lib/decisionReceipts/mapReceiptRow";
import { normalizeDecisionReceiptTimestamp } from "@/lib/decisionReceipts/canonical";

function normalizeIso(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  const text = String(value);
  const parsed = Date.parse(text);
  if (Number.isNaN(parsed)) return text;
  return new Date(parsed).toISOString();
}

function parseClaimRefs(raw: unknown): EvaluatedClaimRef[] {
  if (typeof raw === "string") {
    return JSON.parse(raw) as EvaluatedClaimRef[];
  }
  if (Array.isArray(raw)) return raw as EvaluatedClaimRef[];
  return [];
}

function mapSovereignReceiptRow(row: Record<string, unknown>): DecisionReceiptRecord {
  const claimRefs = parseClaimRefs(row.evaluated_claim_refs).map((ref) => ({
    ...ref,
    issued_at: normalizeDecisionReceiptTimestamp(ref.issued_at),
    expires_at: ref.expires_at ? normalizeDecisionReceiptTimestamp(ref.expires_at) : null,
  }));
  const mapped = mapReceiptRow({
    ...row,
    evaluated_claim_refs: claimRefs,
    evaluated_at: normalizeDecisionReceiptTimestamp(String(normalizeIso(row.evaluated_at) ?? row.evaluated_at)),
    expires_at: row.expires_at
      ? normalizeDecisionReceiptTimestamp(String(normalizeIso(row.expires_at)))
      : null,
    created_at: normalizeIso(row.created_at) ?? row.created_at,
    issuance_finalized_at: row.issuance_finalized_at
      ? normalizeDecisionReceiptTimestamp(String(normalizeIso(row.issuance_finalized_at)))
      : null,
  });
  return mapped;
}
import { querySovereignStagingPg } from "@/lib/persistence/boundary/sovereignStagingPg";
import { ScopedChallengeStoreUnavailableError } from "@/lib/auth/walletAuthorization/errors";

export async function loadTrustExecutionOutcomeReceipt(input: {
  authorizationRef: string;
  partnerId: string;
  applicationId: string;
  challengeId: string;
  policyId: string;
  policyVersion: number;
  subjectPseudonymId: string;
}): Promise<DecisionReceiptRecord | null> {
  const outcome = await querySovereignStagingPg<{
    receipt_id: string;
    partner_id: string;
    application_id: string;
    challenge_id: string;
  }>(
    `select receipt_id, partner_id, application_id, challenge_id
     from public.wallet_scoped_trust_execution_outcomes
     where authorization_ref = $1
     limit 1`,
    [input.authorizationRef],
  );
  if ("error" in outcome) throw new ScopedChallengeStoreUnavailableError(outcome.error);
  const row = outcome.rows[0];
  if (!row?.receipt_id) return null;

  if (
    row.partner_id !== input.partnerId
    || row.application_id !== input.applicationId
    || row.challenge_id !== input.challengeId
  ) {
    throw new ScopedChallengeStoreUnavailableError("outcome_binding_mismatch");
  }

  const receipt = await querySovereignStagingPg<Record<string, unknown>>(
    `select * from public.decision_receipts where id = $1 limit 1`,
    [row.receipt_id],
  );
  if ("error" in receipt) throw new ScopedChallengeStoreUnavailableError(receipt.error);
  const mapped = receipt.rows[0] ? mapSovereignReceiptRow(receipt.rows[0]) : null;
  if (!mapped) return null;

  if (
    mapped.partner_id !== input.partnerId
    || mapped.policy_id !== input.policyId
    || mapped.policy_version !== input.policyVersion
    || mapped.subject_pseudonym_id !== input.subjectPseudonymId
  ) {
    throw new ScopedChallengeStoreUnavailableError("committed_receipt_scope_mismatch");
  }

  return mapped;
}
