// FILE: lib/persistence/boundary/verticalSlice/claimEvidenceRead.ts

import { querySovereignStagingPg } from "../sovereignStagingPg";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";

type ClaimRow = { status: string; expires_at: string | null };
type EvidenceRow = { status: string; expires_at: string | null; revoked_at: string | null };

export type SovereignClaimEvidenceEvaluation = {
  claims_current: boolean;
  evidence_current: boolean;
  reasons: string[];
  store_available: boolean;
};

export async function evaluateClaimEvidenceOnSovereignPg(
  record: DecisionReceiptRecord,
  env?: Record<string, string | undefined>,
  now = new Date(),
): Promise<SovereignClaimEvidenceEvaluation> {
  const reasons: string[] = [];
  let storeAvailable = true;
  const nowMs = now.getTime();

  for (const ref of record.evaluated_claim_refs) {
    const claimId = ref.claim_id;
    if (!claimId) continue;
    const result = await querySovereignStagingPg<ClaimRow>(
      `select status, expires_at from public.sovereign_claim_status where claim_id = $1 limit 1`,
      [claimId],
      env,
    );
    if ("error" in result) {
      storeAvailable = false;
      reasons.push("validity_store_unavailable");
      break;
    }
    const row = result.rows[0];
    if (!row) {
      reasons.push("claim_missing");
      continue;
    }
    if (row.status === "revoked" || row.status === "suspended") {
      reasons.push("claim_revoked");
    }
    if (row.status === "expired") reasons.push("claim_expired");
    if (row.expires_at && Date.parse(row.expires_at) <= nowMs) {
      reasons.push("claim_expired");
    }
  }

  const deps = await querySovereignStagingPg<{ source_credential_id: string }>(
    `select source_credential_id from public.sovereign_receipt_evidence_dependencies where receipt_id = $1`,
    [record.id],
    env,
  );
  if ("error" in deps) {
    storeAvailable = false;
    reasons.push("validity_store_unavailable");
  } else if (record.evaluated_claim_refs.length > 0 && deps.rows.length === 0) {
    reasons.push("source_evidence_missing");
  } else {
    for (const dep of deps.rows) {
      const ev = await querySovereignStagingPg<EvidenceRow>(
        `select status, expires_at, revoked_at from public.sovereign_evidence_sources
          where source_credential_id = $1 limit 1`,
        [dep.source_credential_id],
        env,
      );
      if ("error" in ev) {
        storeAvailable = false;
        reasons.push("validity_store_unavailable");
        break;
      }
      const row = ev.rows[0];
      if (!row) {
        reasons.push("source_evidence_missing");
        continue;
      }
      if (row.status === "revoked" || row.revoked_at) reasons.push("source_evidence_revoked");
      if (row.status === "expired") reasons.push("source_evidence_expired");
      if (row.expires_at && Date.parse(row.expires_at) <= nowMs) {
        reasons.push("source_evidence_expired");
      }
    }
  }

  const unique = Array.from(new Set(reasons));
  const claimsCurrent = !unique.some((r) => r.startsWith("claim_"));
  const evidenceCurrent = !unique.some((r) => r.includes("evidence"));
  return {
    claims_current: claimsCurrent && storeAvailable,
    evidence_current: evidenceCurrent && storeAvailable,
    reasons: unique,
    store_available: storeAvailable,
  };
}
