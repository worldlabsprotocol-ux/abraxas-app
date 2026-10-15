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
  type StagingReadinessInput,
} from "./stagingReadiness571";
import { redactDatabaseConnectionLabel } from "./stagingReadiness571Redact";
import {
  parseStagingExecutionEvidence,
  STAGING_EXECUTION_EVIDENCE_SCHEMA,
} from "./stagingExecutionEvidence";

const SCHEMA_TABLES = [
  "passport_reusable_credentials",
  "passport_holder_possession_keys",
  "passport_institutional_presentation_consents",
  "passport_institutional_authorization_commits",
  "identity_verifications",
] as const;

const SCHEMA_COLUMNS: Record<string, string[]> = {
  passport_reusable_credentials: ["holder_subject_id", "credential_jti"],
  passport_holder_possession_keys: ["holder_subject_id", "public_key_base64"],
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

function founderEvidence() {
  return parseStagingExecutionEvidence({
    schema_version: STAGING_EXECUTION_EVIDENCE_SCHEMA,
    recorded_at: "2026-10-15T10:00:00.000Z",
    browser_authenticated_session: {
      method: "google_zklogin",
      exercised_at: "2026-10-15T10:01:00.000Z",
    },
    idv_human_review: {
      exercised_at: "2026-10-15T10:05:00.000Z",
      approval_authority: "founder_operator",
      verification_record_ref: "idv-test-record-ref",
    },
    holder_possession_registered: {
      exercised_at: "2026-10-15T10:06:00.000Z",
    },
  });
}

function baseInput(overrides: Partial<StagingReadinessInput> = {}): StagingReadinessInput {
  return {
    env: {
      ABRAXAS_PERSISTENCE_BACKEND: "postgres_direct",
      ABRAXAS_SOVEREIGN_PG_URL: "postgresql://postgres:secret@127.0.0.1:5432/staging",
      NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID: "google-client-id",
      ...build546TrustRegistryEnv(),
      ...validIssuerRegistryEnv(),
      ...validRevocationEnv(),
    },
    productionBuildPresent: true,
    ...schemaProbes(true),
    pgConnectivityVerified: true,
    credentialSigningMaterialAvailable: true,
    receiptSigningMaterialAvailable: true,
    executionEvidence: founderEvidence(),
    policyProbe: {
      active_policy_count: 2,
      active_distinct_partners: 2,
      required_partner_ids: [],
      missing_partner_ids: [],
    },
    checkpointDirConfigured: true,
    receiptConsumptionDirConfigured: true,
    ...overrides,
  };
}

describe("Build #571 staging readiness audit", () => {
  it("lists ten dependencies with phase separation", () => {
    const report = buildStagingReadiness571(baseInput());
    expect(report.items).toHaveLength(10);
    expect(report.items.every((row) => row.phase !== undefined)).toBe(true);
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
        policyProbe: null,
        checkpointDirConfigured: false,
        receiptConsumptionDirConfigured: false,
      }),
    );
    expect(report.activation_ready).toBe(false);
    expect(report.failure_codes).toContain("production_build_missing");
    expect(report.failure_codes).toContain("browser_auth_unconfigured");
    expect(report.items.find((i) => i.id === "wallet_auth")?.phase).not.toBe("execution_verified");
  });

  it("reports browser auth as configuration_validated until session exercised", () => {
    const report = buildStagingReadiness571(
      baseInput({
        executionEvidence: { ok: false, code: "staging_evidence_absent" },
      }),
    );
    expect(report.items.find((i) => i.id === "wallet_auth")?.phase).toBe("configuration_validated");
    expect(report.failure_codes).toContain("browser_auth_not_exercised");
  });

  it("rejects invalid credential issuer and receipt registries", () => {
    const report = buildStagingReadiness571(
      baseInput({
        env: {
          ...baseInput().env,
          [PASSPORT_CREDENTIAL_ISSUER_REGISTRY_ENV]: JSON.stringify([{ issuer_id: "x", signing_key_id: "y" }]),
          ABRAXAS_RECEIPT_VERIFICATION_REGISTRY: "not-json",
        },
      }),
    );
    expect(
      report.failure_codes.some((code) =>
        ["credential_public_jwk_missing", "credential_revocation_issuer_missing"].includes(code),
      ),
    ).toBe(true);
    expect(report.failure_codes.some((code) => code.startsWith("receipt_registry_"))).toBe(true);
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
    expect(report.failure_codes).toContain("migration_column_missing");
  });

  it("requires founder execution evidence for human review", () => {
    const report = buildStagingReadiness571(
      baseInput({
        executionEvidence: {
          ok: true,
          evidence: {
            schema_version: STAGING_EXECUTION_EVIDENCE_SCHEMA,
            recorded_at: "2026-10-15T10:00:00.000Z",
            browser_authenticated_session: {
              method: "evm_wallet",
              exercised_at: "2026-10-15T10:01:00.000Z",
            },
          },
        },
      }),
    );
    expect(report.items.find((i) => i.id === "idv_review")?.phase).toBe("blocked_founder");
    expect(report.failure_codes).toContain("idv_review_pending_founder_evidence");
  });

  it("flags inactive or insufficient institutional policies", () => {
    const report = buildStagingReadiness571(
      baseInput({
        policyProbe: {
          active_policy_count: 1,
          active_distinct_partners: 1,
          required_partner_ids: ["partner-a", "partner-b"],
          missing_partner_ids: ["partner-b"],
        },
      }),
    );
    expect(report.items.find((i) => i.id === "institutional_policies")?.phase).toBe("configuration_present");
    expect(report.failure_codes).toContain("institutional_active_policies_insufficient");
  });

  it("passes fully validated staging readiness when execution evidence and probes succeed", () => {
    const report = buildStagingReadiness571(baseInput());
    expect(report.activation_ready).toBe(true);
    expect(report.failure_codes).toHaveLength(0);
    expect(report.items.every((row) => row.phase === "execution_verified")).toBe(true);
  });

  it("redacts database connection labels safely", () => {
    const label = redactDatabaseConnectionLabel(
      "postgresql://operator:supersecret@db.example.com:5432/abraxas?sslmode=require",
    );
    expect(label).not.toContain("supersecret");
    expect(label).not.toContain("operator");
    expect(label).not.toContain("sslmode");
    expect(label).toContain("db.example.com:5432/abraxas");
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
