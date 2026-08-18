// FILE: scripts/demo/lib/demoProvisionerApply.ts
// Apply orchestration for Partner Sandbox holder provisioning.

import {
  buildManualProvisionerClaims,
  buildSandboxScreeningClaim,
} from "./demoProvisionerClaims";
import {
  computeProvisionerAdvisoryLockKey,
  DEMO_SCREENING_REFRESH_WINDOW_HOURS,
  DEMO_SYNTHETIC_JURISDICTION,
} from "./demoProvisionerConfig";
import {
  DemoProvisionerCommittedStateError,
  DemoProvisionerConflictError,
  DemoProvisionerLockError,
  type ProvisionerDatabaseConfig,
} from "./demoProvisionerGuard";
import { runProvisionerApplySession } from "./demoProvisionerPgSession";
import { assertProvisionerSchemaCompatible } from "./demoProvisionerSchemaPreflight";
import {
  assertNoProvisionerConflict,
  fetchCredentialByJti,
  fetchIdentityBySubject,
  loadRecoveryMarkers,
  provisionIdentityBundle,
  provisionSandboxScreening,
} from "./demoProvisionerRepository";
import {
  generateProvisionId,
  deriveSubjectIdFromProvisionId,
} from "./demoProvisionerSubject";
import { signSyntheticIdentityCredential } from "./demoProvisionerSigning";
import {
  tryReadSandboxHolderState,
  writeSandboxHolderStateAtomic,
  type SandboxHolderStateV1,
} from "./demoProvisionerState";
import { maskSubjectId } from "./demoProjectGuard";

export interface ProvisionerApplyReport {
  mode: "apply";
  provisionId: string;
  maskedSubjectId: string;
  identityWritten: boolean;
  screeningRefreshed: boolean;
  screeningExpiresAt: string;
  credentialExpiresAt: string;
  stateWritten: boolean;
}

export function shouldRefreshScreening(expiresAt: string | null, now: Date): boolean {
  if (!expiresAt) return true;
  const remainingMs = new Date(expiresAt).getTime() - now.getTime();
  if (remainingMs <= 0) return true;
  const windowMs = DEMO_SCREENING_REFRESH_WINDOW_HOURS * 60 * 60 * 1000;
  return remainingMs <= windowMs;
}

export async function runProvisionerApply(input: {
  config: ProvisionerDatabaseConfig;
  signingKeyJson: string;
  env: Record<string, string | undefined>;
}): Promise<ProvisionerApplyReport> {
  const now = new Date();
  const existingState = tryReadSandboxHolderState({
    expectedProjectRef: input.config.demoProjectRef,
  });

  const provisionId = existingState?.provision_id ?? generateProvisionId();
  const subjectId = existingState?.subject_id ?? deriveSubjectIdFromProvisionId(provisionId);
  const jti = `urn:uuid:${provisionId}`;

  const signed = await signSyntheticIdentityCredential({
    signingKeyJson: input.signingKeyJson,
    subjectId,
    provisionId,
    issuer: input.config.issuer,
    now,
  });

  const manualClaims = buildManualProvisionerClaims({
    subjectId,
    jti,
    provisionId,
    expiresAt: signed.expiresAt,
    issuedAt: now,
  });

  let identityWritten = false;
  let screeningRefreshed = false;
  let screeningExpiresAt = "";

  const applyResult = await runProvisionerApplySession({
    databaseUrl: input.config.databaseUrl,
    env: input.env,
    advisoryLockKey: computeProvisionerAdvisoryLockKey(input.config.demoProjectRef),
    execute: async (tx) => {
      await assertProvisionerSchemaCompatible(tx);

      const identity = await fetchIdentityBySubject(tx, subjectId);
      const credential = identity?.credential_jti
        ? await fetchCredentialByJti(tx, identity.credential_jti)
        : null;

      assertNoProvisionerConflict({
        subjectId,
        provisionId,
        identity,
        credential,
      });

      const identityMatches =
        identity?.veriff_decision_id === provisionId &&
        identity?.credential_jti === jti &&
        credential?.jti === jti;

      if (!identityMatches) {
        await provisionIdentityBundle(tx, {
          subjectId,
          provisionId,
          jti,
          issuer: input.config.issuer,
          jurisdiction: signed.jurisdiction,
          documentType: signed.documentType,
          jwt: signed.jwt,
          expiresAt: signed.expiresAt,
          manualClaims,
          now,
        });
        identityWritten = true;
      }

      const markers = await loadRecoveryMarkers(tx, provisionId);
      const currentScreeningExpiresAt = markers.sandboxScreeningClaim?.expires_at ?? null;

      if (shouldRefreshScreening(currentScreeningExpiresAt, now)) {
        const screeningClaim = buildSandboxScreeningClaim({
          subjectId,
          provisionId,
          createdAt: now,
        });
        const screening = await provisionSandboxScreening(tx, {
          subjectId,
          provisionId,
          screeningClaim,
          now,
        });
        screeningExpiresAt = screening.screeningExpiresAt;
        screeningRefreshed = true;
      } else {
        if (!currentScreeningExpiresAt) {
          throw new DemoProvisionerConflictError(
            "Sandbox screening claim missing — cannot continue without refresh eligibility",
          );
        }
        screeningExpiresAt = currentScreeningExpiresAt;
      }

      return { screeningExpiresAt };
    },
  }).catch((error: unknown) => {
    if (error instanceof Error && error.message === "provision_lock_held") {
      throw new DemoProvisionerLockError(
        "Another provisioner apply holds the advisory lock for this demo project",
      );
    }
    throw error;
  });

  screeningExpiresAt = applyResult.screeningExpiresAt;

  const state: SandboxHolderStateV1 = {
    schema_version: 1,
    supabase_project_ref: input.config.demoProjectRef,
    provision_id: provisionId,
    subject_id: subjectId,
    credential_jti: jti,
    credential_expires_at: signed.expiresAt.toISOString(),
    screening_expires_at: screeningExpiresAt,
    applied_at: now.toISOString(),
    jurisdiction: DEMO_SYNTHETIC_JURISDICTION,
  };

  let stateWritten = false;
  try {
    writeSandboxHolderStateAtomic(state);
    stateWritten = true;
  } catch (error) {
    throw new DemoProvisionerCommittedStateError(provisionId);
  }

  return {
    mode: "apply",
    provisionId,
    maskedSubjectId: maskSubjectId(subjectId),
    identityWritten,
    screeningRefreshed,
    screeningExpiresAt,
    credentialExpiresAt: signed.expiresAt.toISOString(),
    stateWritten,
  };
}

export function formatProvisionerApplyReport(report: ProvisionerApplyReport): string {
  const lines = [
    "Partner Sandbox Holder Provisioner — APPLY",
    "========================================",
    `provision_id:        ${report.provisionId}`,
    `subject_id (masked): ${report.maskedSubjectId}`,
    `identity_written:    ${report.identityWritten ? "yes" : "no (idempotent)"}`,
    `screening_refreshed: ${report.screeningRefreshed ? "yes" : "no"}`,
    `screening_expires_at: ${report.screeningExpiresAt}`,
    `credential_expires_at: ${report.credentialExpiresAt}`,
    `state_written:       ${report.stateWritten ? "yes" : "no"}`,
    "",
    "Set PARTNER_SANDBOX_DEMO_SUBJECT_ID from scripts/demo/.sandbox-holder.json after verify passes.",
  ];
  return lines.join("\n");
}

export function formatCommittedStateWriteFailure(provisionId: string): string {
  return [
    "CRITICAL: Database commit succeeded but state file write failed.",
    `Recovery handle (non-secret): provision_id=${provisionId}`,
    "Re-run: npm run demo:provision -- --verify --recover <provision_id>",
    "Do not re-apply until recovery or conflict review completes.",
  ].join("\n");
}
