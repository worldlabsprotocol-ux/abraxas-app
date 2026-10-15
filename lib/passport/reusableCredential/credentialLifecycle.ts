// FILE: lib/passport/reusableCredential/credentialLifecycle.ts
// Build #568: holder-visible reusable credential lifecycle (server-derived, fail-closed).

import { selectAuthoritativeVerificationForIssuance } from "@/lib/idv/authoritativeVerificationForIssuance";
import { resolveCredentialStatus, resolveIdentityVerificationStatus } from "@/lib/idv/identityVerificationStates";
import { isPassportReusableCredentialStorageEnabled } from "./storageGate";

export type ReusableCredentialLifecycleState =
  | "pending_verification"
  | "awaiting_human_review"
  | "approved_preparing_credential"
  | "possession_key_required"
  | "credential_issued"
  | "credential_expired"
  | "credential_revoked"
  | "issuance_unavailable";

export type ReusableCredentialRecoveryAction =
  | { kind: "start_identity_verification" }
  | { kind: "wait_for_review" }
  | { kind: "register_possession_key" }
  | { kind: "retry_issuance_backfill" }
  | { kind: "contact_support"; reason: string };

export type ReusableCredentialLifecycleSnapshot = {
  state: ReusableCredentialLifecycleState;
  headline: string;
  detail: string;
  recovery?: ReusableCredentialRecoveryAction;
  possession_key_registered: boolean;
  issuer_backed_credential_count: number;
  storage_enabled: boolean;
};

type IdvRow = {
  status: string | null;
  identity_verification_status: string | null;
  credential_status: string | null;
  credential_jti: string | null;
  credential_issued_at: string | null;
  document_verified: boolean | null;
  liveness_passed: boolean | null;
  updated_at: string | null;
};

export function resolveReusableCredentialLifecycle(input: {
  storageEnabled: boolean;
  possessionKeyRegistered: boolean;
  verificationRows: IdvRow[];
  activeIssuerBackedCredentialCount: number;
  expiredIssuerBackedCredentialCount: number;
  lastIssuanceDeferralCode?: string | null;
}): ReusableCredentialLifecycleSnapshot {
  const base = {
    possession_key_registered: input.possessionKeyRegistered,
    issuer_backed_credential_count: input.activeIssuerBackedCredentialCount,
    storage_enabled: input.storageEnabled,
  };

  if (!input.storageEnabled) {
    return {
      ...base,
      state: "issuance_unavailable",
      headline: "Issuance unavailable in this environment",
      detail: "Reusable credential storage is not enabled. Issuer-backed Passport credentials cannot be listed or issued here.",
      recovery: { kind: "contact_support", reason: "storage_disabled" },
    };
  }

  if (input.activeIssuerBackedCredentialCount > 0) {
    return {
      ...base,
      state: "credential_issued",
      headline: "Credential issued",
      detail: "Your issuer-signed reusable credential is stored and ready for institutional requests after you approve each disclosure.",
    };
  }

  if (input.expiredIssuerBackedCredentialCount > 0 && input.activeIssuerBackedCredentialCount === 0) {
    return {
      ...base,
      state: "credential_expired",
      headline: "Credential expired",
      detail: "Your previous reusable credential expired. Complete a fresh verification when an institution requires current eligibility.",
      recovery: { kind: "start_identity_verification" },
    };
  }

  const rows = input.verificationRows;
  const anyRevoked = rows.some((r) => r.credential_status === "revoked" || r.status === "revoked");
  if (anyRevoked) {
    return {
      ...base,
      state: "credential_revoked",
      headline: "Credential revoked",
      detail: "Your identity credential was revoked. Reusable Passport issuance remains blocked until verification is restored.",
      recovery: { kind: "contact_support", reason: "credential_revoked" },
    };
  }

  const approval = selectAuthoritativeVerificationForIssuance(rows);
  if (approval.ok) {
    if (!input.possessionKeyRegistered) {
      return {
        ...base,
        state: "possession_key_required",
        headline: "Possession key registration required",
        detail: "Your verification is approved. Register this device possession key to receive your issuer-signed reusable credential without repeating identity verification.",
        recovery: { kind: "register_possession_key" },
      };
    }
    return {
      ...base,
      state: "approved_preparing_credential",
      headline: "Approved and preparing credential",
      detail: "Final approval is recorded. Issuance runs when eligibility claims and issuer keys are ready.",
      recovery: { kind: "retry_issuance_backfill" },
    };
  }

  const identityPending = rows.some(
    (r) =>
      resolveIdentityVerificationStatus(r) === "submitted"
      || r.identity_verification_status === "submitted"
      || r.status === "submitted",
  );
  if (identityPending) {
    return {
      ...base,
      state: "awaiting_human_review",
      headline: "Awaiting human review",
      detail: "Your identity verification is with a reviewer. You will not receive a reusable credential until approval is final.",
      recovery: { kind: "wait_for_review" },
    };
  }

  const hasPartial = rows.some((r) => r.credential_jti || r.credential_status === "active");
  if (hasPartial && approval.code === "approval_not_final") {
    return {
      ...base,
      state: "approved_preparing_credential",
      headline: "Approved and preparing credential",
      detail: "Verification signals are still aligning. Issuance stays deferred until approval is authoritative.",
      recovery: { kind: "retry_issuance_backfill" },
    };
  }

  if (!rows.length) {
    return {
      ...base,
      state: "pending_verification",
      headline: "Pending verification",
      detail: "Complete identity verification to become eligible for an issuer-signed reusable credential.",
      recovery: { kind: "start_identity_verification" },
    };
  }

  const credStatus = rows.map((r) => resolveCredentialStatus(r));
  if (credStatus.includes("not_issued")) {
    return {
      ...base,
      state: "pending_verification",
      headline: "Pending verification",
      detail: "Finish identity verification before reusable credential issuance can begin.",
      recovery: { kind: "start_identity_verification" },
    };
  }

  if (input.lastIssuanceDeferralCode === "possession_key_missing") {
    return {
      ...base,
      state: "possession_key_required",
      headline: "Possession key registration required",
      detail: "Register this device possession key to complete reusable credential delivery.",
      recovery: { kind: "register_possession_key" },
    };
  }

  return {
    ...base,
    state: "issuance_unavailable",
    headline: "Issuance unavailable",
    detail: "Reusable credential issuance cannot proceed from the current verification record.",
    recovery: input.lastIssuanceDeferralCode
      ? { kind: "contact_support", reason: input.lastIssuanceDeferralCode }
      : undefined,
  };
}
