// FILE: lib/passport/holderIdentityReconciliationExecution.ts
// Build #580: idempotent, transactional legacy holder reconciliation (operator-approved rows only).

import "server-only";

import { randomBytes } from "crypto";
import { isChainNeutralHolderSubjectId } from "@/lib/auth/holderSubject/subjectId";
import {
  LEGACY_KIND_SUI_ADDRESS,
  type LegacyIdentityAnchor,
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
  | "blocked_idv_not_approved"
  | "blocked_stale_link_conflict"
  | "no_op";

export type ReconciliationExecutionRowAudit = {
  legacyKind: string;
  legacyKey: string;
  action: ReconciliationPlanAction;
  outcome: ReconciliationExecutionOutcome;
  targetSubjectId?: string;
};

export type ReconciliationExecutionResult =
  | { ok: true; mode: "dry_run" | "execute"; audits: ReconciliationExecutionRowAudit[] }
  | { ok: false; code: "execution_not_authorized" | "invalid_target_subject"; detail: string };

function mintCanonicalHolderSubjectId(): string {
  return `abx_hs_${randomBytes(16).toString("hex")}`;
}

async function countApprovedIdvForSui(client: PoolClient, sui: string): Promise<number> {
  const res = await client.query<{ c: number }>(
    `select count(*)::int as c from public.identity_verifications
     where lower(sui_address) = lower($1)
       and coalesce(identity_verification_status, status, '') in ('approved','verified','complete')`,
    [sui],
  );
  return res.rows[0]?.c ?? 0;
}

export function filterOperatorApprovedPlanRows(rows: ReconciliationPlanRow[]): ReconciliationPlanRow[] {
  return rows.filter((row) =>
    row.action === "skip_already_linked"
    || row.action === "link_existing_canonical_subject"
    || row.action === "create_canonical_subject_and_link",
  );
}

export async function executeLegacyIdentityReconciliationBatch(input: {
  mode: "dry_run" | "execute";
  rows: ReconciliationPlanRow[];
  /** Required for execute; must include founder + operator attestation env values. */
  executionAuthorized?: boolean;
}): Promise<ReconciliationExecutionResult> {
  if (input.mode === "execute" && !input.executionAuthorized) {
    return { ok: false, code: "execution_not_authorized", detail: "Operator execution requires explicit authorization." };
  }

  const audits: ReconciliationExecutionRowAudit[] = [];
  const approved = filterOperatorApprovedPlanRows(input.rows);

  const runRow = async (row: ReconciliationPlanRow, txClient: PoolClient, dryRun: boolean) => {
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

    let target = row.targetSubjectId?.trim();
    if (row.action === "create_canonical_subject_and_link") {
      target = mintCanonicalHolderSubjectId();
    }
    if (!target || !isChainNeutralHolderSubjectId(target)) {
      audits.push({
        legacyKind: row.anchor.kind,
        legacyKey: row.anchor.key,
        action: row.action,
        outcome: "blocked_action",
      });
      return;
    }

    if (row.anchor.kind === LEGACY_KIND_SUI_ADDRESS) {
      const approvedCount = await countApprovedIdvForSui(txClient, row.anchor.key);
      if (approvedCount === 0) {
        audits.push({
          legacyKind: row.anchor.kind,
          legacyKey: row.anchor.key,
          action: row.action,
          outcome: "blocked_idv_not_approved",
          targetSubjectId: target,
        });
        return;
      }
    }

    const linkSql = dryRun
      ? `select subject_id from public.passport_holder_legacy_links where legacy_kind = $1 and legacy_key = $2`
      : `select subject_id from public.passport_holder_legacy_links where legacy_kind = $1 and legacy_key = $2 for update`;
    const existing = await txClient.query<{ subject_id: string }>(
      linkSql,
      [row.anchor.kind, row.anchor.kind === LEGACY_KIND_SUI_ADDRESS ? row.anchor.key.toLowerCase() : row.anchor.key],
    );
    const owner = existing.rows[0]?.subject_id;
    if (owner && owner !== target) {
      audits.push({
        legacyKind: row.anchor.kind,
        legacyKey: row.anchor.key,
        action: row.action,
        outcome: "blocked_stale_link_conflict",
        targetSubjectId: target,
      });
      return;
    }

    if (dryRun) {
      audits.push({
        legacyKind: row.anchor.kind,
        legacyKey: row.anchor.key,
        action: row.action,
        outcome: "dry_run_would_apply",
        targetSubjectId: target,
      });
      return;
    }

    await txClient.query(
      `insert into public.passport_holder_subjects (subject_id) values ($1) on conflict do nothing`,
      [target],
    );
    await txClient.query(
      `insert into public.passport_holder_legacy_links (subject_id, legacy_kind, legacy_key)
       values ($1, $2, $3) on conflict do nothing`,
      [target, row.anchor.kind, row.anchor.kind === LEGACY_KIND_SUI_ADDRESS ? row.anchor.key.toLowerCase() : row.anchor.key],
    );
    if (row.anchor.kind === LEGACY_KIND_SUI_ADDRESS) {
      await txClient.query(
        `update public.identity_verifications
         set holder_subject_id = $1, updated_at = now()
         where lower(sui_address) = lower($2)
           and (holder_subject_id is null or holder_subject_id = $1)
           and coalesce(identity_verification_status, status, '') in ('approved','verified','complete')`,
        [target, row.anchor.key],
      );
    }

    audits.push({
      legacyKind: row.anchor.kind,
      legacyKey: row.anchor.key,
      action: row.action,
      outcome: owner ? "skipped_already_linked" : "applied",
      targetSubjectId: target,
    });
  };

  if (input.mode === "dry_run") {
    await withAbraxasPgTransaction(async (client) => {
      for (const row of approved) {
        await runRow(row, client, true);
      }
    });
    return { ok: true, mode: "dry_run", audits };
  }

  await withAbraxasPgTransaction(async (client) => {
    for (const row of approved) {
      await runRow(row, client, false);
    }
  });

  return { ok: true, mode: "execute", audits };
}
