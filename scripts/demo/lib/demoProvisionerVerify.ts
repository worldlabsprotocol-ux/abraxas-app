// FILE: scripts/demo/lib/demoProvisionerVerify.ts
// Read-only verification and recovery for Partner Sandbox holder provisioning.

import { evaluatePolicyRules } from "@/lib/policy/evaluatePolicy";
import { SANDBOX_POLICY_ID } from "@/lib/partner/sandboxPartner";
import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import {
  DEMO_MIN_REHEARSAL_VALIDITY_HOURS,
  DEMO_SYNTHETIC_JURISDICTION,
} from "./demoProvisionerConfig";
import type { ProvisionerDatabaseConfig } from "./demoProvisionerGuard";
import { runProvisionerReadOnlySession } from "./demoProvisionerPgSession";
import {
  fetchActiveClaimsForSubject,
  fetchCredentialByJti,
  loadRecoveryMarkers,
  type CredentialClaimRow,
} from "./demoProvisionerRepository";
import {
  assertProvisionIdFormat,
  deriveSubjectIdFromProvisionId,
} from "./demoProvisionerSubject";
import {
  readSandboxHolderState,
  tryReadSandboxHolderState,
  writeSandboxHolderStateAtomic,
  type SandboxHolderStateV1,
} from "./demoProvisionerState";
import { DemoProvisionerConflictError } from "./demoProvisionerGuard";
import { maskSubjectId } from "./demoProjectGuard";

const SANDBOX_POLICY_RULES = {
  sandbox_only: true,
  required_claims: [
    { claim_type: "identity_verified", max_age_hours: 8760, min_assurance: "L2" },
    { claim_type: "wallet_binding_confirmed", max_age_hours: 720, min_assurance: "L2" },
    { claim_type: "screening_outcome", max_age_hours: 24, must_equal: "clear" },
  ],
} as const;

export interface ProvisionerVerifyReport {
  mode: "verify";
  provisionId: string;
  maskedSubjectId: string;
  credentialStatus: "none" | "active" | "expired" | "revoked";
  policyDecision: string;
  missingClaims: string[];
  screeningExpiresAt: string | null;
  screeningRemainingMs: number | null;
  rehearsalReady: boolean;
  recoveredStateWritten: boolean;
}

function mapClaimRow(row: CredentialClaimRow): CredentialClaimRecord {
  return {
    id: row.id,
    subject_id: row.subject_id,
    credential_jti: row.credential_jti,
    claim_type: row.claim_type as CredentialClaimRecord["claim_type"],
    claim_value: row.claim_value,
    issuer_id: row.issuer_id,
    assurance_level: row.assurance_level as CredentialClaimRecord["assurance_level"],
    issued_at: row.issued_at,
    expires_at: row.expires_at,
    status: row.status as CredentialClaimRecord["status"],
    revocation_reference: null,
    evidence_reference: row.evidence_reference,
    jurisdiction: row.jurisdiction,
    policy_scope: row.policy_scope,
  };
}

function screeningRemainingMs(
  screeningExpiresAt: string | null,
  now: Date,
): number | null {
  if (!screeningExpiresAt) return null;
  return new Date(screeningExpiresAt).getTime() - now.getTime();
}

function rehearsalReady(remainingMs: number | null): boolean {
  if (remainingMs == null) return false;
  const minimumMs = DEMO_MIN_REHEARSAL_VALIDITY_HOURS * 60 * 60 * 1000;
  return remainingMs >= minimumMs;
}

export async function runProvisionerVerify(input: {
  config: ProvisionerDatabaseConfig;
  recoverProvisionId?: string;
  env: Record<string, string | undefined>;
}): Promise<ProvisionerVerifyReport> {
  const now = new Date();
  let provisionId: string;
  let expectedSubjectId: string | undefined;
  let recoveredStateWritten = false;

  if (input.recoverProvisionId) {
    provisionId = assertProvisionIdFormat(input.recoverProvisionId);
    expectedSubjectId = deriveSubjectIdFromProvisionId(provisionId);
  } else {
    const state = tryReadSandboxHolderState({
      expectedProjectRef: input.config.demoProjectRef,
    });
    if (!state) {
      throw new DemoProvisionerConflictError(
        "State file missing — use --verify --recover <provision_id>",
      );
    }
    provisionId = state.provision_id;
    expectedSubjectId = state.subject_id;
  }

  const session = await runProvisionerReadOnlySession({
    databaseUrl: input.config.databaseUrl,
    env: input.env,
    execute: async (tx) => {
      const markers = await loadRecoveryMarkers(tx, provisionId);

      if (expectedSubjectId && markers.subjectId !== expectedSubjectId) {
        throw new DemoProvisionerConflictError("Recovered subject_id does not match markers");
      }

      const claims = (await fetchActiveClaimsForSubject(tx, markers.subjectId)).map(mapClaimRow);
      const evaluation = evaluatePolicyRules(SANDBOX_POLICY_RULES, claims);

      let credentialStatus: ProvisionerVerifyReport["credentialStatus"] = "none";
      if (markers.credential) {
        if (markers.credential.revoked_at) {
          credentialStatus = "revoked";
        } else if (new Date(markers.credential.expiration_date) < now) {
          credentialStatus = "expired";
        } else {
          credentialStatus = "active";
        }
      } else if (markers.identity.credential_jti) {
        const credential = await fetchCredentialByJti(tx, markers.identity.credential_jti);
        if (!credential) credentialStatus = "none";
        else if (credential.revoked_at) credentialStatus = "revoked";
        else if (new Date(credential.expiration_date) < now) credentialStatus = "expired";
        else credentialStatus = "active";
      }

      const screeningExpiresAt = markers.sandboxScreeningClaim?.expires_at ?? null;
      const remainingMs = screeningRemainingMs(screeningExpiresAt, now);

      return {
        markers,
        verify: {
          provisionId,
          maskedSubjectId: maskSubjectId(markers.subjectId),
          credentialStatus,
          policyDecision: evaluation.decision,
          missingClaims: evaluation.missing_claims ?? [],
          screeningExpiresAt,
          screeningRemainingMs: remainingMs,
          rehearsalReady: rehearsalReady(remainingMs) && evaluation.decision === "approved",
        },
      };
    },
  });

  const report = session.verify;

  if (input.recoverProvisionId) {
    const recoveredState: SandboxHolderStateV1 = {
      schema_version: 1,
      supabase_project_ref: input.config.demoProjectRef,
      provision_id: session.markers.provisionId,
      subject_id: session.markers.subjectId,
      credential_jti:
        session.markers.credential?.jti ?? session.markers.identity.credential_jti ?? "",
      credential_expires_at: session.markers.credential?.expiration_date ?? "",
      screening_expires_at: session.markers.sandboxScreeningClaim?.expires_at ?? "",
      applied_at:
        session.markers.sandboxScreeningClaim?.issued_at
        ?? session.markers.manualEvidenceClaims[0]?.issued_at
        ?? now.toISOString(),
      jurisdiction: DEMO_SYNTHETIC_JURISDICTION,
    };

    if (!recoveredState.credential_jti || !recoveredState.credential_expires_at) {
      throw new DemoProvisionerConflictError(
        "Recovery markers incomplete — cannot rebuild state file",
      );
    }

    writeSandboxHolderStateAtomic(recoveredState);
    recoveredStateWritten = true;
  } else {
    readSandboxHolderState({ expectedProjectRef: input.config.demoProjectRef });
  }

  return {
    mode: "verify",
    provisionId: report.provisionId,
    maskedSubjectId: report.maskedSubjectId,
    credentialStatus: report.credentialStatus,
    policyDecision: report.policyDecision,
    missingClaims: report.missingClaims,
    screeningExpiresAt: report.screeningExpiresAt,
    screeningRemainingMs: report.screeningRemainingMs,
    rehearsalReady: report.rehearsalReady,
    recoveredStateWritten,
  };
}

export function formatProvisionerVerifyReport(report: ProvisionerVerifyReport): string {
  const remainingHours =
    report.screeningRemainingMs == null
      ? "n/a"
      : (report.screeningRemainingMs / (60 * 60 * 1000)).toFixed(2);

  const lines = [
    "Partner Sandbox Holder Provisioner — VERIFY",
    "===========================================",
    `provision_id:          ${report.provisionId}`,
    `subject_id (masked):   ${report.maskedSubjectId}`,
    `credential_status:     ${report.credentialStatus}`,
    `policy_decision:       ${report.policyDecision}`,
    `policy_id:             ${SANDBOX_POLICY_ID}`,
    `missing_claims:        ${report.missingClaims.join(", ") || "(none)"}`,
    `screening_expires_at:  ${report.screeningExpiresAt ?? "n/a"}`,
    `screening_remaining_h: ${remainingHours}`,
    `rehearsal_ready:       ${report.rehearsalReady ? "yes" : "no"}`,
    `state_recovered:       ${report.recoveredStateWritten ? "yes" : "no"}`,
    "",
    "Verify is read-only — no screening refresh was performed.",
  ];
  return lines.join("\n");
}

export function verifyExitCode(report: ProvisionerVerifyReport): number {
  if (!report.rehearsalReady || report.policyDecision !== "approved") {
    return 1;
  }
  return 0;
}
