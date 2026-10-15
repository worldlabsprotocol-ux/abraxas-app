// FILE: lib/passport/build571.stagingReadiness.test.ts

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BUILD_546_PRIMARY_KEY, build546TrustRegistryEnv } from "@/lib/institutionalCertification/build546/fixtures";
import {
  credentialIssuerRegistryFromKeyPair,
  PASSPORT_CREDENTIAL_ISSUER_REGISTRY_ENV,
} from "./reusableCredential/credentialIssuerRegistry";
import { BUILD_566_CREDENTIAL_ISSUER_KEY, BUILD_566_CREDENTIAL_ISSUER } from "./reusableCredential/fixtures";
import { PORTABLE_REVOCATION_TEST_ISSUER_ID } from "@/lib/protocol/portableRevocation/fixtures";
import {
  PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS_ENV,
  PORTABLE_REVOCATION_ISSUER_TRUST_ENV,
} from "./reusableCredential/independentInstitutionConfig";
import { build569PortableRevocationIssuerTrustJson } from "./reusableCredential/build569IndependentInstitutionTestHelpers";
import {
  buildStagingReadiness571,
  PORTABLE_REVOCATION_PUBLISHER_URL_ENV,
  STAGING_RECEIPT_CONSUMPTION_DIR_ENV,
  type StagingReadinessInput,
} from "./stagingReadiness571";
import { redactDatabaseConnectionLabel } from "./stagingReadiness571Redact";
import {
  assessStagingExecutionEvidenceIntegrity,
  computeFounderApprovalHmac,
  STAGING_ENVIRONMENT_ID_ENV,
  STAGING_EVIDENCE_APPROVAL_SECRET_ENV,
} from "./stagingExecutionEvidenceIntegrity";
import { STAGING_EXECUTION_EVIDENCE_SCHEMA } from "./stagingExecutionEvidence";

const SCHEMA_TABLES = [
  "passport_reusable_credentials",
  "passport_holder_possession_keys",
  "passport_institutional_presentation_consents",
  "passport_institutional_authorization_commits",
  "identity_verifications",
] as const;

const SCHEMA_COLUMNS: Record<string, string[]> = {
  passport_reusable_credentials: ["holder_subject_id", "credential_jti"],
  passport_holder_possession_keys: ["holder_subject_id", "public_key_b64url"],
  passport_institutional_presentation_consents: ["holder_subject_id", "partner_id", "policy_id"],
  passport_institutional_authorization_commits: [
    "holder_subject_id",
    "partner_id",
    "policy_id",
    "signing_claim_token",
    "signing_claim_expires_at",
  ],
};

function schemaProbes(present: boolean): Pick<StagingReadinessInput, "tableExists" | "columnExists"> {
  return {
    tableExists: (table) => present && SCHEMA_TABLES.includes(table as (typeof SCHEMA_TABLES)[number]),
    columnExists: (table, column) =>
      present && (SCHEMA_COLUMNS[table]?.includes(column) ?? false),
  };
}

function validIssuerRegistryEnv(): Record<string, string> {
  const entry = credentialIssuerRegistryFromKeyPair({
    issuerId: BUILD_566_CREDENTIAL_ISSUER,
    key: BUILD_566_CREDENTIAL_ISSUER_KEY,
    revocationIssuerId: PORTABLE_REVOCATION_TEST_ISSUER_ID,
    snapshotSigningKeyIds: [BUILD_546_PRIMARY_KEY.signingKeyId],
  });
  return {
    [PASSPORT_CREDENTIAL_ISSUER_REGISTRY_ENV]: JSON.stringify([entry]),
    ABRAXAS_PASSPORT_CREDENTIAL_SIGNING_KEY_ID: BUILD_566_CREDENTIAL_ISSUER_KEY.signingKeyId,
  };
}

function validRevocationEnv(): Record<string, string> {
  return {
    [PORTABLE_REVOCATION_PUBLISHER_URL_ENV]: "https://publisher.example/revocation",
    [PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS_ENV]: JSON.stringify([
      {
        revocation_issuer_id: PORTABLE_REVOCATION_TEST_ISSUER_ID,
        snapshot_sequence: 1,
        trusted_payload_hash: "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        snapshot_signing_key_id: BUILD_546_PRIMARY_KEY.signingKeyId,
      },
    ]),
    [PORTABLE_REVOCATION_ISSUER_TRUST_ENV]: build569PortableRevocationIssuerTrustJson(
      BUILD_566_CREDENTIAL_ISSUER_KEY,
    ),
  };
}

function verifiedEvidencePayload() {
  const evidence = {
    schema_version: STAGING_EXECUTION_EVIDENCE_SCHEMA,
    recorded_at: "2026-10-15T11:00:00.000Z",
    staging_environment_id: "staging-test",
    holder_subject_id: "abx_hs_test",
    browser_authenticated_session: {
      method: "evm_wallet" as const,
      exercised_at: "2026-10-15T10:30:00.000Z",
      session_ref: "challenge-1",
    },
    idv_human_review: {
      exercised_at: "2026-10-15T10:45:00.000Z",
      approval_authority: "founder_operator" as const,
      verification_record_ref: "idv-1",
    },
    holder_possession_registered: {
      exercised_at: "2026-10-15T10:50:00.000Z",
    },
  };
  const secret = "test-founder-secret";
  return {
    ...evidence,
    founder_approval_hmac: computeFounderApprovalHmac(evidence, secret),
  };
}

function verifiedIntegrity() {
  return assessStagingExecutionEvidenceIntegrity({
    evidence: verifiedEvidencePayload(),
    env: {
      [STAGING_ENVIRONMENT_ID_ENV]: "staging-test",
      [STAGING_EVIDENCE_APPROVAL_SECRET_ENV]: "test-founder-secret",
    },
    corroboration: {
      browser_authentication_event_corroborated: true,
      browser_authentication_event_at: "2026-10-15T10:29:00.000Z",
      idv_row: {
        holder_subject_id: "abx_hs_test",
        status: "approved",
        identity_verification_status: "approved",
        credential_status: "active",
        credential_jti: "jti-1",
        credential_issued_at: "2026-10-15T10:40:00.000Z",
        document_verified: true,
        liveness_passed: true,
      },
      possession_updated_at: "2026-10-15T10:49:00.000Z",
    },
    nowMs: Date.parse("2026-10-15T12:00:00.000Z"),
  });
}

function baseInput(overrides: Partial<StagingReadinessInput> = {}): StagingReadinessInput {
  return {
    env: {
      ABRAXAS_PERSISTENCE_BACKEND: "postgres_direct",
      ABRAXAS_SOVEREIGN_PG_URL: "postgresql://postgres:secret@127.0.0.1:5432/staging",
      [STAGING_ENVIRONMENT_ID_ENV]: "staging-test",
      [STAGING_EVIDENCE_APPROVAL_SECRET_ENV]: "test-founder-secret",
      NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID: "google-client-id",
      [STAGING_RECEIPT_CONSUMPTION_DIR_ENV]: "/tmp/consumption",
      ABRAXAS_PORTABLE_REVOCATION_CHECKPOINT_DIR: "/tmp/checkpoint",
      ...build546TrustRegistryEnv(),
      ...validIssuerRegistryEnv(),
      ...validRevocationEnv(),
    },
    productionBuildPresent: true,
    ...schemaProbes(true),
    pgConnectivityVerified: true,
    credentialSigningMaterialAvailable: true,
    receiptSigningMaterialAvailable: true,
    executionEvidence: { ok: true, evidence: verifiedEvidencePayload() },
    evidenceIntegrity: verifiedIntegrity(),
    policyProbe: {
      active_policy_count: 2,
      active_distinct_partners: 2,
      required_partner_ids: [],
      missing_partner_ids: [],
    },
    operational: {
      credentialSigningMatchesRegistry: true,
      receiptSigningMatchesRegistry: true,
      publisherSnapshotStrictVerified: true,
      publisherSnapshotAuditLimited: false,
      checkpointDirAccessible: true,
      receiptConsumptionDirAccessible: true,
    },
    ...overrides,
  };
}

describe("Build #571 staging readiness audit", () => {
  it("lists ten dependencies with phase separation", () => {
    const report = buildStagingReadiness571(baseInput());
    expect(report.items).toHaveLength(10);
  });

  it("flags missing configuration without treating env presence as execution verified", () => {
    const report = buildStagingReadiness571(
      baseInput({
        env: { ABRAXAS_PERSISTENCE_BACKEND: "postgres_direct" },
        productionBuildPresent: false,
        ...schemaProbes(false),
        pgConnectivityVerified: false,
        credentialSigningMaterialAvailable: false,
        receiptSigningMaterialAvailable: false,
        executionEvidence: { ok: false, code: "staging_evidence_absent" },
        evidenceIntegrity: null,
        policyProbe: null,
        operational: {
          credentialSigningMatchesRegistry: false,
          receiptSigningMatchesRegistry: false,
          publisherSnapshotStrictVerified: false,
          publisherSnapshotAuditLimited: false,
          checkpointDirAccessible: false,
          receiptConsumptionDirAccessible: false,
        },
      }),
    );
    expect(report.activation_ready).toBe(false);
    expect(report.failure_codes).toContain("production_build_missing");
  });

  it("does not accept self-authenticating founder evidence without corroboration", () => {
    const report = buildStagingReadiness571(
      baseInput({
        evidenceIntegrity: assessStagingExecutionEvidenceIntegrity({
          evidence: {
            schema_version: STAGING_EXECUTION_EVIDENCE_SCHEMA,
            recorded_at: "2026-10-15T11:00:00.000Z",
            staging_environment_id: "staging-test",
            holder_subject_id: "abx_hs_fake",
            browser_authenticated_session: {
              method: "google_zklogin",
              exercised_at: "2026-10-15T10:30:00.000Z",
              session_ref: "oauth-sub-fake",
            },
            idv_human_review: {
              exercised_at: "2026-10-15T10:45:00.000Z",
              approval_authority: "founder_operator",
              verification_record_ref: "fake-idv",
            },
          },
          env: { [STAGING_ENVIRONMENT_ID_ENV]: "staging-test" },
          corroboration: {
            browser_authentication_event_corroborated: false,
            browser_authentication_event_at: null,
            idv_row: null,
            possession_updated_at: null,
          },
          nowMs: Date.parse("2026-10-15T12:00:00.000Z"),
        }),
      }),
    );
    expect(report.activation_ready).toBe(false);
    expect(report.items.find((i) => i.id === "wallet_auth")?.phase).not.toBe("execution_verified");
    expect(report.items.find((i) => i.id === "idv_review")?.phase).not.toBe("execution_verified");
  });

  it("detects incomplete migration schema", () => {
    const report = buildStagingReadiness571(
      baseInput({
        columnExists: (table, column) =>
          table === "passport_institutional_authorization_commits" && column !== "signing_claim_token",
        tableExists: (table) => SCHEMA_TABLES.includes(table as (typeof SCHEMA_TABLES)[number]),
      }),
    );
    expect(report.items.find((i) => i.id === "migrations_140_143")?.phase).toBe("missing");
  });

  it("requires founder corroboration pending for human review without evidence", () => {
    const report = buildStagingReadiness571(
      baseInput({
        executionEvidence: { ok: false, code: "staging_evidence_absent" },
        evidenceIntegrity: null,
      }),
    );
    expect(report.items.find((i) => i.id === "idv_review")?.phase).toBe("blocked_founder");
  });

  it("passes only when operational probes and corroborated evidence succeed", () => {
    const report = buildStagingReadiness571(baseInput());
    expect(report.activation_ready).toBe(true);
    expect(report.items.find((i) => i.id === "migrations_140_143")?.phase).toBe("configuration_validated");
    expect(
      report.items.filter((i) => i.id !== "migrations_140_143").every((row) => row.phase === "execution_verified"),
    ).toBe(true);
  });

  it("redacts database connection labels safely", () => {
    const label = redactDatabaseConnectionLabel(
      "postgresql://operator:supersecret@db.example.com:5432/abraxas?sslmode=require",
    );
    expect(label).not.toContain("supersecret");
    expect(label).not.toContain("operator");
    expect(label).not.toContain("sslmode");
  });

  it("includes design partner acceptance package", () => {
    const doc = readFileSync(
      join(process.cwd(), "docs/partner-handoff/design-partner-acceptance.md"),
      "utf8",
    );
    expect(doc).toContain("independently verifies");
    expect(doc).not.toMatch(/—|–/);
  });
});
