// FILE: lib/passport/holderIdentityReconciliationExecution.ts

import "server-only";

import {
  type ReconciliationExecutionCredentials,
  computeReconciliationBatchDigest,
  verifyReconciliationExecutionAuthorization,
} from "./holderIdentityReconciliationAuth";
import { resolveLegacyAnchorEvidenceFromStores } from "./holderIdentityReconciliationEvidence";
import {
  bindApprovedIdvToLegacyLinkOwner,
  claimLegacyIdentityLink,
} from "./holderIdentityLinkPersistence";
import { assertReconciliationDatabaseBinding } from "./reconciliationDatabaseBinding";
import {
  LEGACY_KIND_SUI_ADDRESS,
  type ReconciliationPlanAction,
  type ReconciliationPlanRow,
} from "./holderIdentityReconciliation";
import type { PoolClient } from "pg";
import { withAbraxasPgTransaction } from "@/lib/persistence/pgPool";

export type ReconciliationExecutionOutcome =
  | "dry_run_would_apply"
  | "applied"
  | "skipped_already_linked"
  | "blocked_action"
  | "blocked_evidence_unresolved"
  | "blocked_idv_not_approved"
  | "blocked_stale_link_conflict"
  | "blocked_link_claim_conflict"
  | "blocked_idv_bind_mismatch"
  | "blocked_row_rolled_back"
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

/** @deprecated Use validateReconciliationExecutionBatch — no silent filtering. */
export function filterOperatorApprovedPlanRows(rows: ReconciliationPlanRow[]): ReconciliationPlanRow[] {
  return rows;
}

export async function executeLegacyIdentityReconciliationBatch(input: {
  mode: "dry_run" | "execute";
  rows: ReconciliationPlanRow[];
  credentials?: ReconciliationExecutionCredentials;
  env?: Record<string, string | undefined>;
}): Promise<ReconciliationExecutionResult> {
  const env = input.env ?? process.env;
  const batchDigest = computeReconciliationBatchDigest(input.rows);
  const audits: ReconciliationExecutionRowAudit[] = [];

  try {
    await withAbraxasPgTransaction(async (client) => {
      const binding = await assertReconciliationDatabaseBinding({ env, client });
      const auth = verifyReconciliationExecutionAuthorization({
        mode: input.mode,
        rows: input.rows,
        credentials: input.credentials,
        env,
        databaseBinding: binding,
      });
      if (!auth.ok) {
        throw Object.assign(new Error(auth.detail), { reconciliationCode: auth.code });
      }

      const dryRun = auth.mode === "dry_run";
      for (const row of input.rows) {
        await runReconciliationRow({ row, client, dryRun, audits });
      }
    }, env);
  } catch (error: unknown) {
    const code =
      typeof error === "object" && error !== null && "reconciliationCode" in error
        ? String((error as { reconciliationCode: string }).reconciliationCode)
        : "execution_failed";
    const detail = error instanceof Error ? error.message : "Reconciliation execution failed.";
    return { ok: false, code, detail };
  }

  return { ok: true, mode: input.mode, audits, batchDigest };
}

async function runReconciliationRow(input: {
  row: ReconciliationPlanRow;
  client: PoolClient;
  dryRun: boolean;
  audits: ReconciliationExecutionRowAudit[];
}): Promise<void> {
  const { row, client, dryRun, audits } = input;

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

  const evidence = await resolveLegacyAnchorEvidenceFromStores(client, row.anchor);
  if (!evidence.ok) {
    audits.push({
      legacyKind: row.anchor.kind,
      legacyKey: row.anchor.key,
      action: row.action,
      outcome: "blocked_evidence_unresolved",
    });
    return;
  }

  if (evidence.kind === LEGACY_KIND_SUI_ADDRESS && evidence.sui.authorizationState !== "approved") {
    audits.push({
      legacyKind: row.anchor.kind,
      legacyKey: row.anchor.key,
      action: row.action,
      outcome: "blocked_idv_not_approved",
    });
    return;
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

  await client.query("SAVEPOINT reconciliation_row");

  try {
    const claim = await claimLegacyIdentityLink({
      client,
      anchor: row.anchor,
      requestedSubjectId: requested,
      allowMintWhenAbsent: allowMint,
    });

    if (!claim.ok) {
      await client.query("ROLLBACK TO SAVEPOINT reconciliation_row");
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
      await client.query("ROLLBACK TO SAVEPOINT reconciliation_row");
      audits.push({
        legacyKind: row.anchor.kind,
        legacyKey: row.anchor.key,
        action: row.action,
        outcome: "blocked_row_rolled_back",
        targetSubjectId: claim.subjectId,
      });
      return;
    }

    await client.query("RELEASE SAVEPOINT reconciliation_row");
    audits.push({
      legacyKind: row.anchor.kind,
      legacyKey: row.anchor.key,
      action: row.action,
      outcome: claim.createdLink ? "applied" : "skipped_already_linked",
      targetSubjectId: claim.subjectId,
      persistedSubjectId: claim.subjectId,
    });
  } catch {
    await client.query("ROLLBACK TO SAVEPOINT reconciliation_row");
    audits.push({
      legacyKind: row.anchor.kind,
      legacyKey: row.anchor.key,
      action: row.action,
      outcome: "blocked_row_rolled_back",
    });
  }
}
