// FILE: lib/passport/holderIdentityReconciliationExecution.ts

import "server-only";

import {
  type ReconciliationExecutionCredentials,
  computeReconciliationBatchDigest,
  filterRowsWithAuthoritativeEvidence,
  verifyReconciliationExecutionAuthorization,
} from "./holderIdentityReconciliationAuth";
import {
  bindApprovedIdvToLegacyLinkOwner,
  claimLegacyIdentityLink,
  countApprovedIdvForSuiAnchor,
} from "./holderIdentityLinkPersistence";
import {
  LEGACY_KIND_SUI_ADDRESS,
  type ReconciliationPlanAction,
  type ReconciliationPlanRow,
} from "./holderIdentityReconciliation";
import type { PoolClient } from "pg";
import { withAbraxasPgTransaction } from "@/lib/persistence/pgPool";
import { supabaseProjectRefFromPostgresUrl } from "@/lib/supabase/projectRefs";
import { resolvePassportDirectPostgresUrl } from "@/lib/persistence/env";

export type ReconciliationExecutionOutcome =
  | "dry_run_would_apply"
  | "applied"
  | "skipped_already_linked"
  | "blocked_action"
  | "blocked_idv_not_approved"
  | "blocked_stale_link_conflict"
  | "blocked_link_claim_conflict"
  | "blocked_idv_bind_mismatch"
  | "no_op";

export type ReconciliationExecutionRowAudit = {
  legacyKind: string;
  legacyKey: string;
  action: ReconciliationPlanAction;
  outcome: ReconciliationExecutionOutcome;
  targetSubjectId?: string;
  persistedSubjectId?: string;
};

export type ReconciliationExecutionResult =
  | { ok: true; mode: "dry_run" | "execute"; audits: ReconciliationExecutionRowAudit[]; batchDigest: string }
  | { ok: false; code: string; detail: string };

export function filterOperatorApprovedPlanRows(rows: ReconciliationPlanRow[]): ReconciliationPlanRow[] {
  return filterRowsWithAuthoritativeEvidence(rows).filter((row) =>
    row.action === "skip_already_linked"
    || row.action === "link_existing_canonical_subject"
    || row.action === "create_canonical_subject_and_link",
  );
}

function resolveBoundDatabaseProjectRef(env: Record<string, string | undefined>): string | null {
  const explicit = env.ABRAXAS_VERIFIED_SUPABASE_PROJECT_REF?.trim();
  if (explicit) return explicit;
  const url = resolvePassportDirectPostgresUrl(env);
  if (!url) return null;
  return supabaseProjectRefFromPostgresUrl(url);
}

export async function executeLegacyIdentityReconciliationBatch(input: {
  mode: "dry_run" | "execute";
  rows: ReconciliationPlanRow[];
  credentials?: ReconciliationExecutionCredentials;
  env?: Record<string, string | undefined>;
}): Promise<ReconciliationExecutionResult> {
  const env = input.env ?? process.env;
  const approved = filterOperatorApprovedPlanRows(input.rows);
  const auth = verifyReconciliationExecutionAuthorization({
    mode: input.mode,
    rows: approved,
    credentials: input.credentials,
    env,
    boundDatabaseProjectRef: resolveBoundDatabaseProjectRef(env),
  });
  if (!auth.ok) {
    return { ok: false, code: auth.code, detail: auth.detail };
  }

  const batchDigest = computeReconciliationBatchDigest(approved);
  const audits: ReconciliationExecutionRowAudit[] = [];
  const dryRun = auth.mode === "dry_run";

  const runRow = async (row: ReconciliationPlanRow, client: PoolClient) => {
    if (row.action === "skip_already_linked") {
      audits.push({
        legacyKind: row.anchor.kind,
        legacyKey: row.anchor.key,
        action: row.action,
        outcome: "skipped_already_linked",
        targetSubjectId: row.targetSubjectId,
      });
      return;
    }

    if (row.action === "block_unverified_wallet" || row.action === "block_ambiguous") {
      audits.push({
        legacyKind: row.anchor.kind,
        legacyKey: row.anchor.key,
        action: row.action,
        outcome: "blocked_action",
      });
      return;
    }

    if (row.anchor.kind === LEGACY_KIND_SUI_ADDRESS) {
      const approvedCount = await countApprovedIdvForSuiAnchor(client, row.anchor.key);
      if (approvedCount === 0) {
        audits.push({
          legacyKind: row.anchor.kind,
          legacyKey: row.anchor.key,
          action: row.action,
          outcome: "blocked_idv_not_approved",
          targetSubjectId: row.targetSubjectId,
        });
        return;
      }
    }

    const requestedSubject = row.targetSubjectId?.trim() ?? null;
    const requested =
      row.action === "create_canonical_subject_and_link" && !requestedSubject
        ? null
        : requestedSubject;
    const allowMint =
      row.action === "create_canonical_subject_and_link" && !requestedSubject;

    if (dryRun) {
      audits.push({
        legacyKind: row.anchor.kind,
        legacyKey: row.anchor.key,
        action: row.action,
        outcome: "dry_run_would_apply",
        targetSubjectId: requested ?? undefined,
      });
      return;
    }

    const claim = await claimLegacyIdentityLink({
      client,
      anchor: row.anchor,
      requestedSubjectId: requested,
      allowMintWhenAbsent: allowMint,
    });

    if (!claim.ok) {
      audits.push({
        legacyKind: row.anchor.kind,
        legacyKey: row.anchor.key,
        action: row.action,
        outcome:
          claim.code === "conflict_different_subject"
            ? "blocked_stale_link_conflict"
            : "blocked_link_claim_conflict",
        targetSubjectId: requested ?? undefined,
        persistedSubjectId: claim.persistedSubjectId,
      });
      return;
    }

    const bind = await bindApprovedIdvToLegacyLinkOwner({
      client,
      anchor: row.anchor,
      authoritativeSubjectId: claim.subjectId,
    });
    if (!bind.ok) {
      audits.push({
        legacyKind: row.anchor.kind,
        legacyKey: row.anchor.key,
        action: row.action,
        outcome: "blocked_idv_bind_mismatch",
        targetSubjectId: claim.subjectId,
        persistedSubjectId: claim.subjectId,
      });
      return;
    }

    audits.push({
      legacyKind: row.anchor.kind,
      legacyKey: row.anchor.key,
      action: row.action,
      outcome: claim.createdLink ? "applied" : "skipped_already_linked",
      targetSubjectId: claim.subjectId,
      persistedSubjectId: claim.subjectId,
    });
  };

  await withAbraxasPgTransaction(async (client) => {
    for (const row of approved) {
      await runRow(row, client);
    }
  }, env);

  return { ok: true, mode: auth.mode, audits, batchDigest };
}
