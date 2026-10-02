// FILE: lib/custody/recoveryModel.ts
// Recovery semantics for holder-controlled credentials (design boundary).

export const RECOVERY_MODEL_VERSION = "1.0.0" as const;

export type RecoveryScenario =
  | "lost_device"
  | "new_device"
  | "browser_cleared"
  | "compromised_device"
  | "issuer_revocation"
  | "key_rotation"
  | "expired_evidence"
  | "unavailable_issuer";

export interface RecoveryPath {
  scenario: RecoveryScenario;
  holderAction: string;
  abraxasRole: string;
  evidenceRequired: string;
  resultsIn: string;
  rawEvidenceRetained: boolean;
}

export const RECOVERY_PATHS: readonly RecoveryPath[] = [
  {
    scenario: "lost_device",
    holderAction: "Re-authenticate via zkLogin/OAuth and re-bind wallet",
    abraxasRole: "Restore account linkage; re-resolve active credentials from server-side claim store",
    evidenceRequired: "Account recovery factor (OAuth), not raw ID re-upload if valid credential remains",
    resultsIn: "Passport session restored; reusable credentials re-presented if still active",
    rawEvidenceRetained: false,
  },
  {
    scenario: "new_device",
    holderAction: "Sign in on new device; approve partner presentations",
    abraxasRole: "Issue fresh session; credentials remain server-resolved until holder vault migration",
    evidenceRequired: "None if credentials not expired/revoked",
    resultsIn: "Multi-device use via account session, not browser-only storage",
    rawEvidenceRetained: false,
  },
  {
    scenario: "browser_cleared",
    holderAction: "Restart partner flow or sign in again",
    abraxasRole: "Resume from server-side credential/ledger state where applicable",
    evidenceRequired: "Re-attestation only if TTL expired (e.g. L0 24h ledger)",
    resultsIn: "Flow continuity without treating browser storage as credential authority",
    rawEvidenceRetained: false,
  },
  {
    scenario: "compromised_device",
    holderAction: "Revoke sessions; request credential revocation via privacy control plane",
    abraxasRole: "Revoke credentials, invalidate receipts via live validity, block new presentations",
    evidenceRequired: "Holder-initiated revocation request",
    resultsIn: "access_revoked_pending_purge; partners must re-verify",
    rawEvidenceRetained: false,
  },
  {
    scenario: "issuer_revocation",
    holderAction: "Re-verify with issuer when credential revoked",
    abraxasRole: "Honor issuer revocation in credential_claims status registry",
    evidenceRequired: "Fresh verification per policy",
    resultsIn: "Revoked claims excluded from policy evaluation",
    rawEvidenceRetained: false,
  },
  {
    scenario: "key_rotation",
    holderAction: "Accept updated signing keys via registry",
    abraxasRole: "Verify receipts against active signing key registry",
    evidenceRequired: "None for holder",
    resultsIn: "Old signatures invalid after rotation window",
    rawEvidenceRetained: false,
  },
  {
    scenario: "expired_evidence",
    holderAction: "Re-submit verification",
    abraxasRole: "Enforce claim/receipt expires_at in evaluation",
    evidenceRequired: "Policy-dependent re-verification",
    resultsIn: "Must reverify outcome for partners",
    rawEvidenceRetained: false,
  },
  {
    scenario: "unavailable_issuer",
    holderAction: "Use alternate policy path or wait",
    abraxasRole: "Fail closed; do not elevate assurance without issuer",
    evidenceRequired: "Alternate issuer or self-attestation where policy allows",
    resultsIn: "Policy denial or downgrade, never fabricated assurance",
    rawEvidenceRetained: false,
  },
];

export const RECOVERY_NON_GOALS = [
  "Browser-only storage as sole credential authority",
  "Permanent raw evidence retention for recovery convenience",
  "Automatic wallet address disclosure to all partners on recovery",
] as const;
