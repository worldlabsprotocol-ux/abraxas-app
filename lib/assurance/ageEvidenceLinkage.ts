// FILE: lib/assurance/ageEvidenceLinkage.ts
// Production fail-closed vs sandbox-degraded age evidence audit linkage.

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  checkAgeEvidenceStorageAvailability,
  type AgeEvidenceRecordResult,
} from "@/lib/assurance/ageEvidence";
import { getBiometricAssessment } from "@/lib/idv/biometric/persistAssessment";
import { getPolicy } from "@/lib/verification/requestsService";
import { GOOD_TROUBLE_PARTNER_ID } from "@/lib/goodTrouble/constants";

export function requiresAgeEvidenceLinkage(minimumAgeGate: number | null | undefined): boolean {
  return minimumAgeGate != null && minimumAgeGate >= 21;
}

export function logAgeEvidenceAudit(
  event: string,
  meta: Record<string, string | boolean | number | null | undefined>,
): void {
  console.warn(JSON.stringify({
    type: "age_evidence_audit",
    event,
    ts: new Date().toISOString(),
    ...meta,
  }));
}

export type AgeEvidencePrecheckResult =
  | { ok: true; sandbox_only: boolean }
  | { ok: false; error: string; status: number };

/**
 * Resolve whether the linked partner policy is sandbox-only.
 * Defaults to false (production fail-closed) when unknown.
 */
export async function resolveReviewPolicySandboxFlag(
  sb: SupabaseClient,
  input: { captureSessionId?: string | null; suiAddress: string },
): Promise<boolean> {
  const { data: vr } = await sb
    .from("verification_requests")
    .select("policy_id, partner_id")
    .eq("sui_address", input.suiAddress)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (vr?.policy_id) {
    const policy = await getPolicy(vr.policy_id as string);
    if (policy?.rules_json?.sandbox_only === true) return true;
    if (policy?.rules_json?.sandbox_only === false) return false;
  }

  if (input.captureSessionId) {
    const assessment = await getBiometricAssessment(input.captureSessionId);
    const partnerId = (assessment?.signals as { partner_id?: string } | undefined)?.partner_id;
    if (partnerId === GOOD_TROUBLE_PARTNER_ID) return true;
  }

  return false;
}

/** Block production approvals when audit storage is unavailable. */
export async function precheckAgeEvidenceLinkage(input: {
  sandboxOnly: boolean;
  minimumAgeGate: number | null | undefined;
}): Promise<AgeEvidencePrecheckResult> {
  if (!requiresAgeEvidenceLinkage(input.minimumAgeGate)) {
    return { ok: true, sandbox_only: input.sandboxOnly };
  }

  const availability = await checkAgeEvidenceStorageAvailability();
  if (availability.available) {
    return { ok: true, sandbox_only: input.sandboxOnly };
  }

  if (input.sandboxOnly) {
    logAgeEvidenceAudit("storage_unavailable_sandbox_continue", {
      minimum_age_gate: input.minimumAgeGate ?? null,
      reason: availability.reason ?? "unknown",
    });
    return { ok: true, sandbox_only: true };
  }

  logAgeEvidenceAudit("storage_unavailable_production_blocked", {
    minimum_age_gate: input.minimumAgeGate ?? null,
    reason: availability.reason ?? "unknown",
  });
  return {
    ok: false,
    error: "Age evidence audit storage is required for production approval but is unavailable",
    status: 503,
  };
}

export type AgeEvidenceFinalizeResult =
  | { ok: true; evidenceId?: string; storage_unavailable?: boolean }
  | { ok: false; error: string; status: number };

/** After credential issuance, finalize evidence linkage with sandbox/production rules. */
export function finalizeAgeEvidenceLinkage(input: {
  sandboxOnly: boolean;
  minimumAgeGate: number | null | undefined;
  evidence: AgeEvidenceRecordResult;
}): AgeEvidenceFinalizeResult {
  if (!requiresAgeEvidenceLinkage(input.minimumAgeGate)) {
    return { ok: true };
  }

  if (input.evidence.ok) {
    return { ok: true, evidenceId: input.evidence.id };
  }

  if (input.evidence.storage_unavailable && input.sandboxOnly) {
    logAgeEvidenceAudit("storage_unavailable_sandbox_post_issuance", {
      minimum_age_gate: input.minimumAgeGate ?? null,
      error: input.evidence.error,
    });
    return { ok: true, storage_unavailable: true };
  }

  if (!input.sandboxOnly) {
    logAgeEvidenceAudit("linkage_failed_production_blocked", {
      minimum_age_gate: input.minimumAgeGate ?? null,
      error: input.evidence.error,
    });
    return {
      ok: false,
      error: "Production approval requires age evidence audit linkage",
      status: 503,
    };
  }

  logAgeEvidenceAudit("linkage_failed_sandbox_warning", {
    minimum_age_gate: input.minimumAgeGate ?? null,
    error: input.evidence.error,
  });
  return { ok: true, storage_unavailable: true };
}
