#!/usr/bin/env npx tsx
// FILE: scripts/build-571/staging-readiness-audit.ts
// Founder controlled staging readiness baseline (no secrets in output).

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadReceiptSigningKey } from "@/lib/decisionReceipts/signing";
import {
  buildStagingReadiness571,
  STAGING_INSTITUTION_PARTNER_IDS_ENV,
  STAGING_RECEIPT_CONSUMPTION_DIR_ENV,
  PORTABLE_REVOCATION_CHECKPOINT_DIR_ENV,
  PORTABLE_REVOCATION_PUBLISHER_URL_ENV,
  summarizeReadinessPhases,
  type StagingPolicyProbe,
} from "@/lib/passport/stagingReadiness571";
import { redactDatabaseConnectionLabel } from "@/lib/passport/stagingReadiness571Redact";
import { loadStagingExecutionEvidenceFromEnv } from "@/lib/passport/stagingExecutionEvidence";
import {
  assessStagingExecutionEvidenceIntegrity,
  type EvidenceCorroborationSnapshot,
} from "@/lib/passport/stagingExecutionEvidenceIntegrity";
import { loadPassportCredentialSigningKey } from "@/lib/passport/reusableCredential/passportCredentialSigning";
import { loadInstitutionPortableRevocationBootstrapTrusts } from "@/lib/passport/reusableCredential/independentInstitutionConfig";
import {
  auditPortableRevocationPublisherSnapshot,
  credentialPublicKeyMatchesRegistry,
  directoryReadWriteAccessible,
  probePortableRevocationPublisher,
  receiptPublicKeyMatchesRegistry,
} from "@/lib/passport/stagingReadiness571Operational";
import { loadPortableRevocationIssuerTrustPolicy } from "@/lib/passport/reusableCredential/independentInstitutionConfig";
import type { VerificationRowForIssuance } from "@/lib/idv/authoritativeVerificationForIssuance";

export const STAGING_REVOCATION_PROBE_STATUS_ID_ENV = "ABRAXAS_STAGING_REVOCATION_PROBE_STATUS_ID";
export const STAGING_REVOCATION_PROBE_RECEIPT_ID_ENV = "ABRAXAS_STAGING_REVOCATION_PROBE_RECEIPT_ID";

function pgUrl(): string | null {
  return (
    process.env.ABRAXAS_SOVEREIGN_PG_URL?.trim()
    ?? process.env.ABRAXAS_DATABASE_URL?.trim()
    ?? null
  );
}

function psqlQuery(sql: string): string | null {
  const url = pgUrl();
  if (!url) return null;
  try {
    return execFileSync("psql", [url, "-tAc", sql], { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

function tableExists(table: string): boolean {
  const out = psqlQuery(`select to_regclass('public.${table}') is not null`);
  return out === "t";
}

function columnExists(table: string, column: string): boolean {
  const out = psqlQuery(
    `select exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = '${table}' and column_name = '${column}'
     )`,
  );
  return out === "t";
}

function pgConnectivityVerified(): boolean {
  const out = psqlQuery("select 1");
  return out === "1";
}

function probePolicies(): StagingPolicyProbe | null {
  const activeCountRaw = psqlQuery(`select count(*)::text from public.partner_policies where status = 'active'`);
  const distinctRaw = psqlQuery(
    `select count(distinct partner_id)::text from public.partner_policies where status = 'active'`,
  );
  if (activeCountRaw === null || distinctRaw === null) return null;
  const active_policy_count = Number.parseInt(activeCountRaw, 10);
  const active_distinct_partners = Number.parseInt(distinctRaw, 10);
  const requiredRaw = process.env[STAGING_INSTITUTION_PARTNER_IDS_ENV]?.trim();
  const required_partner_ids = requiredRaw
    ? requiredRaw.split(",").map((id) => id.trim()).filter(Boolean)
    : [];
  const missing_partner_ids: string[] = [];
  for (const partnerId of required_partner_ids) {
    const exists = psqlQuery(
      `select exists (
         select 1 from public.partner_policies where status = 'active' and partner_id = '${partnerId.replace(/'/g, "''")}'
       )`,
    );
    if (exists !== "t") missing_partner_ids.push(partnerId);
  }
  return {
    active_policy_count: Number.isFinite(active_policy_count) ? active_policy_count : 0,
    active_distinct_partners: Number.isFinite(active_distinct_partners) ? active_distinct_partners : 0,
    required_partner_ids,
    missing_partner_ids,
  };
}

function loadBrowserAuthenticationEvent(
  sessionRef: string,
  method: string,
): Pick<EvidenceCorroborationSnapshot, "browser_authentication_event_at" | "browser_authentication_event_corroborated"> {
  const escaped = sessionRef.replace(/'/g, "''");
  if (method === "google_zklogin") {
    const eventAt = psqlQuery(
      `select updated_at::text from public.sui_zklogin_identities where oauth_sub = '${escaped}' limit 1`,
    );
    return {
      browser_authentication_event_corroborated: Boolean(eventAt),
      browser_authentication_event_at: eventAt || null,
    };
  }
  const eventAt = psqlQuery(
    `select consumed_at::text from public.passport_wallet_auth_challenges where id = '${escaped}' and consumed_at is not null limit 1`,
  );
  return {
    browser_authentication_event_corroborated: Boolean(eventAt),
    browser_authentication_event_at: eventAt || null,
  };
}

function loadCorroborationSnapshot(input: {
  holderSubjectId: string;
  verificationRecordRef?: string;
  browserSessionRef?: string;
  browserMethod?: string;
}): EvidenceCorroborationSnapshot | null {
  if (!pgUrl()) return null;
  const escapedSubject = input.holderSubjectId.replace(/'/g, "''");

  let idv_row: VerificationRowForIssuance | null = null;
  if (input.verificationRecordRef) {
    const escapedRef = input.verificationRecordRef.replace(/'/g, "''");
    const raw = psqlQuery(
      `select row_to_json(t) from (
         select wallet_address, holder_subject_id, status, identity_verification_status,
                credential_status, credential_jti, credential_issued_at,
                document_verified, liveness_passed, updated_at
         from public.identity_verifications
         where id::text = '${escapedRef}' or holder_subject_id = '${escapedRef}'
         limit 1
       ) t`,
    );
    if (raw) {
      try {
        idv_row = JSON.parse(raw) as VerificationRowForIssuance;
      } catch {
        idv_row = null;
      }
    }
  }

  const possessionUpdated = psqlQuery(
    `select coalesce(updated_at::text, '') from public.passport_holder_possession_keys where holder_subject_id = '${escapedSubject}' limit 1`,
  );

  const browserEvent =
    input.browserSessionRef && input.browserMethod
      ? loadBrowserAuthenticationEvent(input.browserSessionRef, input.browserMethod)
      : {
          browser_authentication_event_corroborated: false,
          browser_authentication_event_at: null,
        };

  return {
    idv_row,
    possession_updated_at: possessionUpdated && possessionUpdated.length > 0 ? possessionUpdated : null,
    ...browserEvent,
  };
}

async function main() {
  const env = process.env as Record<string, string | undefined>;
  const executionEvidence = loadStagingExecutionEvidenceFromEnv(env, (path) => readFileSync(path, "utf8"));

  const evidenceIntegrity = executionEvidence.ok
    ? assessStagingExecutionEvidenceIntegrity({
        evidence: executionEvidence.evidence,
        env,
        corroboration: loadCorroborationSnapshot({
          holderSubjectId: executionEvidence.evidence.holder_subject_id,
          verificationRecordRef: executionEvidence.evidence.idv_human_review?.verification_record_ref,
          browserSessionRef: executionEvidence.evidence.browser_authenticated_session?.session_ref,
          browserMethod: executionEvidence.evidence.browser_authenticated_session?.method,
        }),
      })
    : null;

  const credentialKey = loadPassportCredentialSigningKey();
  const receiptKey = loadReceiptSigningKey();
  const checkpointDir = env[PORTABLE_REVOCATION_CHECKPOINT_DIR_ENV]?.trim();
  const consumptionDir = env[STAGING_RECEIPT_CONSUMPTION_DIR_ENV]?.trim();
  const bootstrapTrusts = loadInstitutionPortableRevocationBootstrapTrusts(env);
  const publisherUrl = env[PORTABLE_REVOCATION_PUBLISHER_URL_ENV]?.trim();
  const probeStatusId = env[STAGING_REVOCATION_PROBE_STATUS_ID_ENV]?.trim();

  let publisherSnapshotStrictVerified = false;
  let publisherSnapshotAuditLimited = false;
  let publisherSnapshotAuditDetail: string | undefined;
  const issuerTrust = loadPortableRevocationIssuerTrustPolicy(env);
  const probeReceiptId = env[STAGING_REVOCATION_PROBE_RECEIPT_ID_ENV]?.trim();
  if (publisherUrl && probeStatusId) {
    const probe = await probePortableRevocationPublisher({
      publisherUrl,
      statusId: probeStatusId,
    });
    if (probe.ok) {
      const strict = await auditPortableRevocationPublisherSnapshot({
        artifact: probe.snapshot,
        env,
        issuerTrust,
        bootstrapTrusts,
        probeReceiptId,
      });
      if (strict.ok) {
        publisherSnapshotStrictVerified = true;
      } else if ("limited" in strict && strict.limited) {
        publisherSnapshotAuditLimited = true;
        publisherSnapshotAuditDetail = strict.detail;
      }
    }
  }

  const reportCore = buildStagingReadiness571({
    env,
    productionBuildPresent: existsSync(join(process.cwd(), ".next/BUILD_ID")),
    tableExists,
    columnExists,
    pgConnectivityVerified: pgConnectivityVerified(),
    credentialSigningMaterialAvailable: credentialKey !== null,
    receiptSigningMaterialAvailable: receiptKey !== null,
    executionEvidence,
    evidenceIntegrity,
    policyProbe: probePolicies(),
    operational: {
      credentialSigningMatchesRegistry: credentialKey
        ? credentialPublicKeyMatchesRegistry({
            signingKeyId: credentialKey.signingKeyId,
            publicKeyJwk: credentialKey.publicKeyJwk,
            env,
          })
        : false,
      receiptSigningMatchesRegistry: receiptKey
        ? receiptPublicKeyMatchesRegistry({
            signingKeyId: receiptKey.signingKeyId,
            publicKeyJwk: receiptKey.publicKeyJwk,
            env,
          })
        : false,
      publisherSnapshotStrictVerified,
      publisherSnapshotAuditLimited,
      publisherSnapshotAuditDetail,
      checkpointDirAccessible: checkpointDir ? directoryReadWriteAccessible(checkpointDir) : false,
      receiptConsumptionDirAccessible: consumptionDir ? directoryReadWriteAccessible(consumptionDir) : false,
    },
  });

  const report = {
    build: 571,
    generated_at: new Date().toISOString(),
    database: pgUrl() ? redactDatabaseConnectionLabel(pgUrl()!) : null,
    execution_evidence: executionEvidence.ok ? "parsed" : executionEvidence.code,
    evidence_integrity: evidenceIntegrity
      ? {
          environment_match: evidenceIntegrity.environment_match,
          timestamps_valid: evidenceIntegrity.timestamps_valid,
          founder_approval_valid: evidenceIntegrity.founder_approval_valid,
          browser: evidenceIntegrity.browser.status,
          idv_review: evidenceIntegrity.idv_review.status,
          possession: evidenceIntegrity.possession.status,
        }
      : null,
    items: reportCore.items,
    failure_codes: reportCore.failure_codes,
    phase_summary: summarizeReadinessPhases(reportCore.items),
    activation_ready: reportCore.activation_ready,
    audit_limits:
      "This audit corroborates founder evidence against PostgreSQL authoritative records and read-only operational probes. It does not exercise browser sign-in, human review, or holder consent flows by itself.",
  };
  console.log(JSON.stringify(report, null, 2));
  process.exit(reportCore.activation_ready ? 0 : 2);
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, code: "staging_audit_failed", detail: String(error) }, null, 2));
  process.exit(2);
});
