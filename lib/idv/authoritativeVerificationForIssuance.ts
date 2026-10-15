// FILE: lib/idv/authoritativeVerificationForIssuance.ts
// Build #567: fail-closed final verification gate before reusable Passport credential issuance.

import {
  resolveCredentialStatus,
  resolveIdentityVerificationStatus,
  type CredentialStatus,
  type IdentityVerificationStatus,
} from "@/lib/idv/identityVerificationStates";

export type VerificationRowForIssuance = {
  wallet_address?: string | null;
  holder_subject_id?: string | null;
  status?: string | null;
  identity_verification_status?: string | null;
  credential_status?: string | null;
  credential_jti?: string | null;
  credential_issued_at?: string | Date | null;
  document_verified?: boolean | null;
  liveness_passed?: boolean | null;
  updated_at?: string | Date | null;
};

export type AuthoritativeVerificationFailure =
  | "no_verification_record"
  | "verification_contradictory"
  | "verification_ambiguous"
  | "approval_not_final"
  | "credential_jti_missing"
  | "credential_not_issued"
  | "legacy_status_not_approved";

export type AuthoritativeVerificationSuccess = {
  ok: true;
  row: VerificationRowForIssuance;
  credentialJti: string;
  identityStatus: IdentityVerificationStatus;
  credentialStatus: CredentialStatus;
};

export type AuthoritativeVerificationResult =
  | AuthoritativeVerificationSuccess
  | { ok: false; code: AuthoritativeVerificationFailure };

const LEGACY_BLOCKED = new Set(["revoked", "suspended", "pending"]);

function rowTimestamp(row: VerificationRowForIssuance): number {
  const issued = row.credential_issued_at ? Date.parse(String(row.credential_issued_at)) : 0;
  const updated = row.updated_at ? Date.parse(String(row.updated_at)) : 0;
  return Math.max(issued, updated);
}

/** All three persisted approval signals must agree; legacy status must not contradict. */
export function isAuthoritativeFinalApproval(row: VerificationRowForIssuance): boolean {
  if (!row.credential_jti?.trim()) return false;
  if (row.status !== "approved") return false;
  if (row.identity_verification_status !== "approved") return false;
  if (row.credential_status !== "active") return false;
  if (!row.credential_issued_at) return false;
  if (row.document_verified !== true) return false;
  if (row.liveness_passed !== true) return false;

  const identityStatus = resolveIdentityVerificationStatus(row);
  const credentialStatus = resolveCredentialStatus(row);
  if (identityStatus !== "approved") return false;
  if (credentialStatus !== "active") return false;
  return true;
}

function hasPartialCredentialWithoutFinalApproval(row: VerificationRowForIssuance): boolean {
  const hasCredentialArtifact =
    Boolean(row.credential_jti?.trim())
    || row.credential_status === "active"
    || row.credential_status === "suspended";
  if (!hasCredentialArtifact) return false;
  return !isAuthoritativeFinalApproval(row);
}

function hasContradictoryApprovalSignals(row: VerificationRowForIssuance): boolean {
  if (row.status && LEGACY_BLOCKED.has(row.status)) return true;
  if (row.identity_verification_status && row.identity_verification_status !== "approved") {
    if (row.credential_status === "active" || row.credential_jti) return true;
  }
  if (row.credential_status === "revoked" || row.credential_status === "suspended") return true;
  if (row.status === "approved" && row.identity_verification_status && row.identity_verification_status !== "approved") {
    return true;
  }
  if (row.credential_status === "active" && row.identity_verification_status !== "approved") return true;
  return false;
}

/**
 * Select the single authoritative finalized verification for a holder subject.
 * Deterministic ordering: newest credential_issued_at / updated_at first.
 */
export function selectAuthoritativeVerificationForIssuance(
  rows: VerificationRowForIssuance[],
): AuthoritativeVerificationResult {
  if (!rows.length) {
    return { ok: false, code: "no_verification_record" };
  }

  for (const row of rows) {
    if (hasContradictoryApprovalSignals(row) || hasPartialCredentialWithoutFinalApproval(row)) {
      return { ok: false, code: "verification_contradictory" };
    }
  }

  const finalized = rows.filter(isAuthoritativeFinalApproval);
  if (!finalized.length) {
    const anyJti = rows.some((r) => r.credential_jti?.trim());
    if (anyJti && rows.some((r) => r.credential_status === "active" && !isAuthoritativeFinalApproval(r))) {
      return { ok: false, code: "approval_not_final" };
    }
    if (rows.some((r) => r.status !== "approved")) {
      return { ok: false, code: "legacy_status_not_approved" };
    }
    return { ok: false, code: "approval_not_final" };
  }

  finalized.sort((a, b) => rowTimestamp(b) - rowTimestamp(a));
  const distinctJti = new Set(finalized.map((r) => r.credential_jti!.trim()));
  if (distinctJti.size > 1) {
    return { ok: false, code: "verification_ambiguous" };
  }

  const selected = finalized[0]!;
  return {
    ok: true,
    row: selected,
    credentialJti: selected.credential_jti!.trim(),
    identityStatus: resolveIdentityVerificationStatus(selected),
    credentialStatus: resolveCredentialStatus(selected),
  };
}
