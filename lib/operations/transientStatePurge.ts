// FILE: lib/operations/transientStatePurge.ts
// Bounded purge for scale-operations transient durable tables. No receipt/audit deletion.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { purgeExpiredZkLoginOAuthJtis } from "@/lib/sui/zklogin/oauthJtiReplayStore";

const SANDBOX_READINESS_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_BATCH_LIMIT = 500;

export interface TransientStatePurgeResult {
  provenance_flow_sessions: number;
  provenance_content_submissions: number;
  organization_eligibility_consents: number;
  sandbox_readiness_runs: number;
  zklogin_oauth_jti_consumed: number;
}

function skipDurableStore(): boolean {
  return Boolean(process.env.VITEST);
}

async function deleteExpiredRows(input: {
  table: string;
  cutoffIso: string;
  limit: number;
}): Promise<number> {
  const sb = requireSupabaseAdmin();
  const { data, error } = await sb
    .from(input.table)
    .delete()
    .lt("expires_at", input.cutoffIso)
    .select("expires_at")
    .limit(input.limit);
  if (error) throw error;
  return (data ?? []).length;
}

async function deleteSandboxReadinessRuns(input: {
  cutoffIso: string;
  limit: number;
}): Promise<number> {
  const sb = requireSupabaseAdmin();
  const { data, error } = await sb
    .from("sandbox_readiness_runs")
    .delete()
    .lt("recorded_at", input.cutoffIso)
    .select("recorded_at")
    .limit(input.limit);
  if (error) throw error;
  return (data ?? []).length;
}

export async function purgeExpiredTransientState(input?: {
  limit?: number;
  dryRun?: boolean;
}): Promise<TransientStatePurgeResult> {
  const empty: TransientStatePurgeResult = {
    provenance_flow_sessions: 0,
    provenance_content_submissions: 0,
    organization_eligibility_consents: 0,
    sandbox_readiness_runs: 0,
    zklogin_oauth_jti_consumed: 0,
  };

  if (skipDurableStore() || input?.dryRun) {
    return empty;
  }

  const limit = Math.min(input?.limit ?? DEFAULT_BATCH_LIMIT, 2000);
  const now = Date.now();
  const expiredCutoff = new Date(now).toISOString();
  const sandboxCutoff = new Date(now - SANDBOX_READINESS_RETENTION_MS).toISOString();

  try {
    const [
      sessions,
      submissions,
      consents,
      sandboxRuns,
      jti,
    ] = await Promise.all([
      deleteExpiredRows({ table: "provenance_flow_sessions", cutoffIso: expiredCutoff, limit }),
      deleteExpiredRows({ table: "provenance_content_submissions", cutoffIso: expiredCutoff, limit }),
      deleteExpiredRows({ table: "organization_eligibility_consents", cutoffIso: expiredCutoff, limit }),
      deleteSandboxReadinessRuns({ cutoffIso: sandboxCutoff, limit }),
      purgeExpiredZkLoginOAuthJtis({ limit }),
    ]);

    return {
      provenance_flow_sessions: sessions,
      provenance_content_submissions: submissions,
      organization_eligibility_consents: consents,
      sandbox_readiness_runs: sandboxRuns,
      zklogin_oauth_jti_consumed: jti.deleted,
    };
  } catch {
    return empty;
  }
}
