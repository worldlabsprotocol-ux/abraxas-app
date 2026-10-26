// FILE: lib/persistence/boundary/verticalSlice/claimEvidenceRead.ts

import {
  deriveEvidenceIntegrityVerdict,
  type EvidenceClaimSnapshot,
  type EvidenceSourceSnapshot,
} from "@/lib/decisionReceipts/evidenceIntegrityContract";
import type { DecisionReceiptRecord, EvaluatedClaimRef } from "@/lib/decisionReceipts/types";
import { querySovereignStagingPg } from "../sovereignStagingPg";

type ClaimRow = { status: string; expires_at: string | null };
type EvidenceRow = { status: string; expires_at: string | null; revoked_at: string | null };

export type SovereignClaimEvidenceEvaluation = {
  claims_current: boolean;
  evidence_current: boolean;
  reasons: string[];
  store_available: boolean;
};

export type SovereignEvidenceIntegrityGraph = {
  store_available: boolean;
  binding_found: boolean;
  source: EvidenceSourceSnapshot | null;
  claims: EvidenceClaimSnapshot[];
  evaluated_claim_refs: EvaluatedClaimRef[];
  issuer_refs: string[];
  reasons: string[];
};

function normalizeClaimStatus(status: string): EvidenceClaimSnapshot["status"] {
  if (status === "revoked" || status === "suspended" || status === "expired") {
    return status;
  }
  return "active";
}

function normalizeSourceStatus(status: string): EvidenceSourceSnapshot["status"] {
  if (status === "revoked" || status === "expired") return status;
  return "active";
}

async function loadClaimSnapshot(
  claimId: string,
  env: Record<string, string | undefined> | undefined,
): Promise<
  | { ok: true; snapshot: EvidenceClaimSnapshot; ref: EvaluatedClaimRef }
  | { ok: false; reason: string }
> {
  const result = await querySovereignStagingPg<ClaimRow>(
    `select status, expires_at from public.sovereign_claim_status where claim_id = $1 limit 1`,
    [claimId],
    env,
  );
  if ("error" in result) return { ok: false, reason: "validity_store_unavailable" };
  const row = result.rows[0];
  if (!row) return { ok: false, reason: "claim_missing" };
  const status = normalizeClaimStatus(row.status);
  const expiresAt = row.expires_at;
  return {
    ok: true,
    snapshot: { claim_id: claimId, status, expires_at: expiresAt },
    ref: {
      claim_id: claimId,
      claim_type: "wallet_trust_execution",
      issuer_id: "issuer:abraxas",
      status,
      issued_at: new Date().toISOString(),
      expires_at: expiresAt,
    },
  };
}

async function loadSourceSnapshot(
  sourceCredentialId: string,
  env: Record<string, string | undefined> | undefined,
): Promise<{ ok: true; snapshot: EvidenceSourceSnapshot } | { ok: false; reason: string }> {
  const result = await querySovereignStagingPg<EvidenceRow>(
    `select status, expires_at, revoked_at from public.sovereign_evidence_sources
     where source_credential_id = $1 limit 1`,
    [sourceCredentialId],
    env,
  );
  if ("error" in result) return { ok: false, reason: "validity_store_unavailable" };
  const row = result.rows[0];
  if (!row) return { ok: false, reason: "source_evidence_missing" };
  return {
    ok: true,
    snapshot: {
      source_credential_id: sourceCredentialId,
      status: normalizeSourceStatus(row.status),
      expires_at: row.expires_at,
      revoked_at: row.revoked_at,
    },
  };
}

function summarizeGraphReasons(input: {
  storeAvailable: boolean;
  reasons: string[];
}): Pick<SovereignClaimEvidenceEvaluation, "claims_current" | "evidence_current" | "reasons" | "store_available"> {
  const unique = Array.from(new Set(input.reasons));
  const claimsCurrent = input.storeAvailable && !unique.some((r) => r.startsWith("claim_"));
  const evidenceCurrent = input.storeAvailable && !unique.some((r) => r.includes("evidence"));
  return {
    claims_current: claimsCurrent,
    evidence_current: evidenceCurrent,
    reasons: unique,
    store_available: input.storeAvailable,
  };
}

export async function loadSovereignEvidenceIntegrityGraphForReceipt(
  record: DecisionReceiptRecord,
  env?: Record<string, string | undefined>,
): Promise<SovereignEvidenceIntegrityGraph> {
  const reasons: string[] = [];
  let storeAvailable = true;
  const claimSnapshots: EvidenceClaimSnapshot[] = [];
  const evaluatedClaimRefs: EvaluatedClaimRef[] = [];
  const issuerSet = new Set<string>();

  for (const ref of record.evaluated_claim_refs) {
    const claimId = ref.claim_id;
    if (!claimId) continue;
    const loaded = await loadClaimSnapshot(claimId, env);
    if (!loaded.ok) {
      if (loaded.reason === "validity_store_unavailable") storeAvailable = false;
      reasons.push(loaded.reason);
      continue;
    }
    claimSnapshots.push(loaded.snapshot);
    evaluatedClaimRefs.push({ ...ref, status: loaded.snapshot.status, expires_at: loaded.snapshot.expires_at });
    issuerSet.add(ref.issuer_id);
  }

  const deps = await querySovereignStagingPg<{ source_credential_id: string }>(
    `select source_credential_id from public.sovereign_receipt_evidence_dependencies where receipt_id = $1`,
    [record.id],
    env,
  );
  let depRows: { source_credential_id: string }[] = [];
  if ("error" in deps) {
    storeAvailable = false;
    reasons.push("validity_store_unavailable");
  } else {
    depRows = deps.rows;
    if (record.evaluated_claim_refs.length > 0 && depRows.length === 0) {
      reasons.push("source_evidence_missing");
    }
  }

  let source: EvidenceSourceSnapshot | null = null;
  const sourceIds = Array.from(new Set(depRows.map((r) => r.source_credential_id)));
  if (sourceIds.length > 1) reasons.push("source_evidence_inconsistent");
  if (sourceIds.length === 1) {
    const loadedSource = await loadSourceSnapshot(sourceIds[0]!, env);
    if (!loadedSource.ok) {
      if (loadedSource.reason === "validity_store_unavailable") storeAvailable = false;
      reasons.push(loadedSource.reason);
    } else {
      source = loadedSource.snapshot;
    }
  }

  const integrity = deriveEvidenceIntegrityVerdict({
    receipt_id: record.id,
    subject_pseudonym_id: record.subject_pseudonym_id,
    expected_subject_pseudonym_id: record.subject_pseudonym_id,
    partner_id: record.partner_id,
    policy_id: record.policy_id,
    source,
    claims: claimSnapshots,
    store_available: storeAvailable,
  });
  const summary = summarizeGraphReasons({
    storeAvailable,
    reasons: [...reasons, ...integrity.reasons],
  });
  return {
    store_available: summary.store_available,
    binding_found: record.evaluated_claim_refs.length > 0,
    source,
    claims: claimSnapshots,
    evaluated_claim_refs: evaluatedClaimRefs,
    issuer_refs: Array.from(issuerSet).sort(),
    reasons: summary.reasons,
  };
}

export async function loadSovereignEvidenceIntegrityGraphForTrustExecution(
  input: {
    partnerId: string;
    applicationId: string;
    policyId: string;
    policyVersion: number;
    subjectPseudonymId: string;
  },
  env?: Record<string, string | undefined>,
): Promise<SovereignEvidenceIntegrityGraph> {
  const reasons: string[] = [];
  let storeAvailable = true;

  const bindings = await querySovereignStagingPg<{
    source_credential_id: string;
    claim_id: string;
    partner_id: string;
    policy_id: string;
    policy_version: number;
  }>(
    `select source_credential_id, claim_id, partner_id, policy_id, policy_version
     from public.wallet_scoped_trust_authoritative_evidence
     where partner_id = $1
       and application_id = $2::uuid
       and policy_id = $3
       and policy_version = $4
       and subject_pseudonym_id = $5`,
    [
      input.partnerId,
      input.applicationId,
      input.policyId,
      input.policyVersion,
      input.subjectPseudonymId,
    ],
    env,
  );
  if ("error" in bindings) {
    return {
      store_available: false,
      binding_found: false,
      source: null,
      claims: [],
      evaluated_claim_refs: [],
      issuer_refs: [],
      reasons: ["validity_store_unavailable"],
    };
  }
  if (bindings.rows.length === 0) {
    return {
      store_available: true,
      binding_found: false,
      source: null,
      claims: [],
      evaluated_claim_refs: [],
      issuer_refs: [],
      reasons: ["authoritative_evidence_binding_missing"],
    };
  }

  for (const row of bindings.rows) {
    if (row.partner_id !== input.partnerId) reasons.push("tenant_mismatch");
    if (row.policy_id !== input.policyId || row.policy_version !== input.policyVersion) {
      reasons.push("policy_binding_mismatch");
    }
  }

  const sourceIds = Array.from(new Set(bindings.rows.map((r) => r.source_credential_id)));
  if (sourceIds.length > 1) reasons.push("source_evidence_inconsistent");

  let source: EvidenceSourceSnapshot | null = null;
  if (sourceIds.length === 1) {
    const loadedSource = await loadSourceSnapshot(sourceIds[0]!, env);
    if (!loadedSource.ok) {
      if (loadedSource.reason === "validity_store_unavailable") storeAvailable = false;
      reasons.push(loadedSource.reason);
    } else {
      source = loadedSource.snapshot;
    }
  }

  const claimSnapshots: EvidenceClaimSnapshot[] = [];
  const evaluatedClaimRefs: EvaluatedClaimRef[] = [];
  for (const row of bindings.rows) {
    const loaded = await loadClaimSnapshot(row.claim_id, env);
    if (!loaded.ok) {
      if (loaded.reason === "validity_store_unavailable") storeAvailable = false;
      reasons.push(loaded.reason);
      continue;
    }
    claimSnapshots.push(loaded.snapshot);
    evaluatedClaimRefs.push(loaded.ref);
  }

  const integrity = deriveEvidenceIntegrityVerdict({
    receipt_id: "pending_trust_execution",
    subject_pseudonym_id: input.subjectPseudonymId,
    expected_subject_pseudonym_id: input.subjectPseudonymId,
    partner_id: input.partnerId,
    policy_id: input.policyId,
    source,
    claims: claimSnapshots,
    store_available: storeAvailable,
  });
  const summary = summarizeGraphReasons({
    storeAvailable,
    reasons: [...reasons, ...integrity.reasons],
  });
  return {
    store_available: summary.store_available,
    binding_found: true,
    source,
    claims: claimSnapshots,
    evaluated_claim_refs: evaluatedClaimRefs,
    issuer_refs: ["issuer:abraxas"],
    reasons: summary.reasons,
  };
}

export async function evaluateClaimEvidenceOnSovereignPg(
  record: DecisionReceiptRecord,
  env?: Record<string, string | undefined>,
  now = new Date(),
): Promise<SovereignClaimEvidenceEvaluation> {
  void now;
  const graph = await loadSovereignEvidenceIntegrityGraphForReceipt(record, env);
  const summary = summarizeGraphReasons({
    storeAvailable: graph.store_available,
    reasons: graph.reasons,
  });
  return summary;
}

export async function ensureSovereignReceiptEvidenceDependencies(input: {
  receiptId: string;
  sourceCredentialId: string;
  env?: Record<string, string | undefined>;
}): Promise<{ ok: true } | { ok: false; code: string }> {
  const write = await querySovereignStagingPg(
    `insert into public.sovereign_receipt_evidence_dependencies (receipt_id, source_credential_id, dependency_type)
     values ($1, $2, 'source_receipt')
     on conflict (receipt_id, source_credential_id) do nothing`,
    [input.receiptId, input.sourceCredentialId],
    input.env,
  );
  if ("error" in write) return { ok: false, code: "evidence_dependency_write_failed" };
  return { ok: true };
}
