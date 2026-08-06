// FILE: lib/sui/zklogin/recoveryAudit.ts
// Operator-safe zkLogin recovery audit metadata — no PII or secrets.

import type { ZkLoginAudienceCohort, ZkLoginLoginMode } from "@/lib/sui/zklogin/audienceCohorts";

export type ZkLoginRecoveryOutcome =
  | "success"
  | "audience_mismatch"
  | "no_existing_account"
  | "rejected_untrusted_audience";

export interface ZkLoginRecoveryAuditInput {
  loginMode: ZkLoginLoginMode;
  audienceCohort: ZkLoginAudienceCohort;
  outcome: ZkLoginRecoveryOutcome;
}

const FORBIDDEN_AUDIT_KEYS = /^(email|oauth_sub|sub|user_salt|salt|id_token|jwt|wallet|sui_address|address|client_id|audience)$/i;

export function buildZkLoginRecoveryAuditMetadata(
  input: ZkLoginRecoveryAuditInput,
): Record<string, string> {
  return {
    event: "zklogin_identity_recovery",
    login_mode: input.loginMode,
    audience_cohort: input.audienceCohort,
    outcome: input.outcome,
  };
}

export function auditMetadataHasNoPii(meta: Record<string, unknown>): boolean {
  for (const key of Object.keys(meta)) {
    if (FORBIDDEN_AUDIT_KEYS.test(key)) return false;
    const value = meta[key];
    if (typeof value === "string" && value.includes("@")) return false;
  }
  return true;
}
