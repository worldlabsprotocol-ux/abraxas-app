// FILE: scripts/demo/lib/demoProvisionerDryRun.ts
// Offline dry-run plan for Partner Sandbox holder provisioning.

import {
  DEMO_DRY_RUN_PROVISION_ID,
  DEMO_SANDBOX_HOLDER_STATE_PATH,
  DEMO_SCREENING_REFRESH_WINDOW_HOURS,
  DEMO_MIN_REHEARSAL_VALIDITY_HOURS,
  DEMO_SCREENING_TTL_HOURS,
  manualEvidenceReference,
  sandboxEvidenceReference,
} from "./demoProvisionerConfig";
import type { ProvisionerDryRunConfig } from "./demoProvisionerGuard";
import { deriveSubjectIdFromProvisionId } from "./demoProvisionerSubject";
import { maskProjectRef, maskSubjectId } from "./demoProjectGuard";

export interface ProvisionerDryRunReport {
  mode: "dry-run";
  illustrativeOnly: true;
  provisionId: string;
  maskedSubjectId: string;
  stateFilePath: string;
  screeningRefreshWindowHours: number;
  minRehearsalValidityHours: number;
  screeningTtlHours: number;
  manualEvidenceReference: string;
  sandboxEvidenceReference: string;
  mutationTables: string[];
  transactionNote: string;
  maskedProjectRef: string;
  issuer: string;
}

export function buildProvisionerDryRunReport(
  config: ProvisionerDryRunConfig,
): ProvisionerDryRunReport {
  const illustrativeSubject = deriveSubjectIdFromProvisionId(DEMO_DRY_RUN_PROVISION_ID);

  return {
    mode: "dry-run",
    illustrativeOnly: true,
    provisionId: DEMO_DRY_RUN_PROVISION_ID,
    maskedSubjectId: maskSubjectId(illustrativeSubject),
    stateFilePath: DEMO_SANDBOX_HOLDER_STATE_PATH,
    screeningRefreshWindowHours: DEMO_SCREENING_REFRESH_WINDOW_HOURS,
    minRehearsalValidityHours: DEMO_MIN_REHEARSAL_VALIDITY_HOURS,
    screeningTtlHours: DEMO_SCREENING_TTL_HOURS,
    manualEvidenceReference: manualEvidenceReference(DEMO_DRY_RUN_PROVISION_ID),
    sandboxEvidenceReference: sandboxEvidenceReference(DEMO_DRY_RUN_PROVISION_ID),
    mutationTables: [
      "identity_verifications",
      "identity_verification_events",
      "abraxas_credentials",
      "wallet_bindings",
      "credential_claims",
      "audit_events",
    ],
    transactionNote:
      "Apply mode executes all mutations on one guarded Session Pooler pg.Client in one explicit transaction. State file write occurs only after COMMIT and is not atomic with the database.",
    maskedProjectRef: maskProjectRef(config.demoProjectRef),
    issuer: config.issuer,
  };
}

export function formatProvisionerDryRunReport(report: ProvisionerDryRunReport): string {
  const lines = [
    "Partner Sandbox Holder Provisioner — DRY RUN",
    "==========================================",
    `Target project: ${report.maskedProjectRef}`,
    `Issuer:         ${report.issuer}`,
    `State file:     ${report.stateFilePath}`,
    "",
    "Illustrative-only identity (non-persisted):",
    `  provision_id: ${report.provisionId}`,
    `  subject_id:   ${report.maskedSubjectId}`,
    `  manual marker:    ${report.manualEvidenceReference}`,
    `  sandbox marker:   ${report.sandboxEvidenceReference}`,
    "",
    `Screening TTL:              ${report.screeningTtlHours}h`,
    `Apply refresh window:       ${report.screeningRefreshWindowHours}h before expiry`,
    `Verify rehearsal minimum:   ${report.minRehearsalValidityHours}h remaining`,
    "",
    "Planned mutation tables (apply only):",
    ...report.mutationTables.map((table) => `  - ${table}`),
    "",
    report.transactionNote,
    "",
    "Dry-run performed no DNS, certificate read, database client creation, secret prompt,",
    "state-file access, or mutation.",
  ];
  return lines.join("\n");
}
