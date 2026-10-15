// FILE: lib/passport/stagingReadiness571.ts

import { existsSync } from "node:fs";
import { join } from "node:path";
import { loadReceiptVerificationRegistry } from "@/lib/decisionReceipts/verificationKeyLifecycle/registry";
import { RECEIPT_VERIFICATION_REGISTRY_ENV } from "@/lib/decisionReceipts/verificationKeyLifecycle";
import {
  loadPassportCredentialIssuerRegistry,
  type PassportCredentialIssuerRegistryEntry,
} from "./reusableCredential/credentialIssuerRegistry";
import { PASSPORT_CREDENTIAL_SIGNING_KEY_ID_ENV } from "./reusableCredential/passportCredentialSigning";
import {
  loadInstitutionPortableRevocationBootstrapTrusts,
  loadPortableRevocationIssuerTrustPolicy,
  PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS_ENV,
  PORTABLE_REVOCATION_ISSUER_TRUST_ENV,
} from "./reusableCredential/independentInstitutionConfig";
import type { PortableRevocationBootstrapTrust } from "@/lib/protocol/portableRevocation";
import type { ParseStagingExecutionEvidenceResult } from "./stagingExecutionEvidence";
import type { StagingEvidenceIntegrityResult } from "./stagingExecutionEvidenceIntegrity";

export type ReadinessPhase =
  | "missing"
  | "configuration_present"
  | "configuration_validated"
  | "execution_verified"
  | "blocked_founder";

export type StagingReadinessItem = {
  id: string;
  label: string;
  phase: ReadinessPhase;
  detail: string;
  failure_code?: string;
};

export type StagingPolicyProbe = {
  active_policy_count: number;
  active_distinct_partners: number;
  required_partner_ids: string[];
  missing_partner_ids: string[];
};

export type StagingOperationalProbes = {
  credentialSigningMatchesRegistry: boolean;
  receiptSigningMatchesRegistry: boolean;
  publisherSnapshotMatchesBootstrap: boolean;
  checkpointDirAccessible: boolean;
  receiptConsumptionDirAccessible: boolean;
};

export type StagingReadinessInput = {
  env: Record<string, string | undefined>;
  productionBuildPresent: boolean;
  tableExists: (table: string) => boolean;
  columnExists: (table: string, column: string) => boolean;
  pgConnectivityVerified: boolean;
  credentialSigningMaterialAvailable: boolean;
  receiptSigningMaterialAvailable: boolean;
  executionEvidence: ParseStagingExecutionEvidenceResult;
  evidenceIntegrity: StagingEvidenceIntegrityResult | null;
  policyProbe: StagingPolicyProbe | null;
  operational: StagingOperationalProbes;
};

export type StagingReadinessReport = {
  items: StagingReadinessItem[];
  failure_codes: string[];
  activation_ready: boolean;
};

export const STAGING_INSTITUTION_PARTNER_IDS_ENV = "ABRAXAS_STAGING_INSTITUTION_PARTNER_IDS";
export const STAGING_RECEIPT_CONSUMPTION_DIR_ENV = "ABRAXAS_STAGING_RECEIPT_CONSUMPTION_DIR";
export const PORTABLE_REVOCATION_PUBLISHER_URL_ENV = "ABRAXAS_PORTABLE_REVOCATION_PUBLISHER_URL";
export const PORTABLE_REVOCATION_CHECKPOINT_DIR_ENV = "ABRAXAS_PORTABLE_REVOCATION_CHECKPOINT_DIR";

const MIGRATION_FILES = [
  "140_passport_reusable_credential_state.sql",
  "141_passport_institutional_presentation_consent.sql",
  "142_passport_institutional_authorization_commits.sql",
  "143_passport_authorization_signing_claim.sql",
] as const;

const MIGRATION_SCHEMA_REQUIREMENTS: { table: string; columns: string[] }[] = [
  { table: "passport_reusable_credentials", columns: ["holder_subject_id", "credential_jti"] },
  { table: "passport_holder_possession_keys", columns: ["holder_subject_id", "public_key_b64url"] },
  { table: "passport_institutional_presentation_consents", columns: ["holder_subject_id", "partner_id", "policy_id"] },
  {
    table: "passport_institutional_authorization_commits",
    columns: ["holder_subject_id", "partner_id", "policy_id", "signing_claim_token", "signing_claim_expires_at"],
  },
];

function envTrimmed(env: Record<string, string | undefined>, name: string): string {
  return env[name]?.trim() ?? "";
}

function migrationRepoFilesPresent(): boolean {
  const base = join(process.cwd(), "supabase/migrations");
  return MIGRATION_FILES.every((file) => existsSync(join(base, file)));
}

function validatePublicCredentialRegistry(
  registry: PassportCredentialIssuerRegistryEntry[],
): { ok: true } | { ok: false; code: string } {
  if (!registry.length) return { ok: false, code: "credential_issuer_registry_empty" };
  for (const entry of registry) {
    if (!entry.issuer_id?.trim()) return { ok: false, code: "credential_issuer_id_missing" };
    if (!entry.signing_key_id?.trim()) return { ok: false, code: "credential_signing_key_id_missing" };
    if (!entry.revocation_issuer_id?.trim()) return { ok: false, code: "credential_revocation_issuer_missing" };
    const jwk = entry.public_jwk;
    if (!jwk || typeof jwk !== "object") return { ok: false, code: "credential_public_jwk_missing" };
    if ("d" in jwk && typeof (jwk as JsonWebKey).d === "string") {
      return { ok: false, code: "credential_registry_private_material_forbidden" };
    }
    if (!jwk.kty || !jwk.x) return { ok: false, code: "credential_public_jwk_incomplete" };
  }
  return { ok: true };
}

function validateBootstrapTrustStructure(
  trusts: PortableRevocationBootstrapTrust[],
): { ok: true } | { ok: false; code: string } {
  if (!trusts.length) return { ok: false, code: "bootstrap_trusts_empty" };
  for (const trust of trusts) {
    if (!trust.revocation_issuer_id?.trim()) return { ok: false, code: "bootstrap_revocation_issuer_missing" };
    if (typeof trust.snapshot_sequence !== "number" || trust.snapshot_sequence < 0) {
      return { ok: false, code: "bootstrap_snapshot_sequence_invalid" };
    }
    if (!trust.trusted_payload_hash?.trim() || trust.trusted_payload_hash.length < 16) {
      return { ok: false, code: "bootstrap_payload_hash_invalid" };
    }
    if (!trust.snapshot_signing_key_id?.trim()) return { ok: false, code: "bootstrap_signing_key_missing" };
  }
  return { ok: true };
}

function assessMigrationSchema(
  tableExists: (table: string) => boolean,
  columnExists: (table: string, column: string) => boolean,
  pgConnectivityVerified: boolean,
): { phase: ReadinessPhase; detail: string; failure_code?: string } {
  if (!migrationRepoFilesPresent()) {
    return {
      phase: "blocked_founder",
      detail: "Migration SQL 140 to 143 missing from repository checkout",
      failure_code: "migration_files_missing",
    };
  }
  for (const req of MIGRATION_SCHEMA_REQUIREMENTS) {
    if (!tableExists(req.table)) {
      return {
        phase: "missing",
        detail: `Table public.${req.table} not present. Apply migrations 140 to 143 with founder approval on target database.`,
        failure_code: "migration_table_missing",
      };
    }
    for (const column of req.columns) {
      if (!columnExists(req.table, column)) {
        return {
          phase: "missing",
          detail: `Column public.${req.table}.${column} missing (migration 140 to 143 incomplete).`,
          failure_code: "migration_column_missing",
        };
      }
    }
  }
  return {
    phase: "configuration_validated",
    detail: pgConnectivityVerified
      ? "Migrations 140 to 143 schema installed on connected database (not an exercised authorization flow)"
      : "Migrations 140 to 143 schema requirements satisfied (connectivity not verified)",
  };
}

function browserAuthConfigured(env: Record<string, string | undefined>): boolean {
  const zk =
    envTrimmed(env, "NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID")
    || envTrimmed(env, "NEXT_PUBLIC_GOOGLE_ZKLOGIN_LEGACY_CLIENT_ID");
  const walletStaging =
    envTrimmed(env, "ABRAXAS_WALLET_AUTH_ENABLED") === "1"
    || envTrimmed(env, "NEXT_PUBLIC_PASSPORT_WALLET_AUTH_ENABLED") === "1";
  return Boolean(zk || walletStaging);
}

function item(
  id: string,
  label: string,
  phase: ReadinessPhase,
  detail: string,
  failure_code?: string,
): StagingReadinessItem {
  return failure_code ? { id, label, phase, detail, failure_code } : { id, label, phase, detail };
}

export function buildStagingReadiness571(input: StagingReadinessInput): StagingReadinessReport {
  const {
    env,
    productionBuildPresent,
    tableExists,
    columnExists,
    pgConnectivityVerified,
    credentialSigningMaterialAvailable,
    receiptSigningMaterialAvailable,
    executionEvidence,
    evidenceIntegrity,
    policyProbe,
    operational,
  } = input;

  const items: StagingReadinessItem[] = [];
  const failure_codes: string[] = [];
  const pushFailure = (code?: string) => {
    if (code && !failure_codes.includes(code)) failure_codes.push(code);
  };

  // 1. Passport routes and production build
  if (!productionBuildPresent) {
    items.push(
      item(
        "passport_routes",
        "Passport routes and production build",
        "missing",
        "Run npm run build before staging activation rehearsal",
        "production_build_missing",
      ),
    );
    pushFailure("production_build_missing");
  } else {
    items.push(
      item(
        "passport_routes",
        "Passport routes and production build",
        "execution_verified",
        "Production build artifact present",
      ),
    );
  }

  // 2. Browser authentication
  const configured = browserAuthConfigured(env);
  const browserVerdict = evidenceIntegrity?.browser;
  if (browserVerdict?.status === "verified") {
    items.push(
      item(
        "wallet_auth",
        "Wallet and Google zkLogin authentication",
        "execution_verified",
        "Authenticated browser session corroborated against holder subject bindings",
      ),
    );
  } else if (browserVerdict && browserVerdict.status !== "absent") {
    items.push(
      item(
        "wallet_auth",
        "Wallet and Google zkLogin authentication",
        browserVerdict.status === "blocked_founder" ? "blocked_founder" : "configuration_validated",
        "Founder execution evidence present but browser authentication is not corroborated",
        browserVerdict.code,
      ),
    );
    pushFailure(browserVerdict.code);
  } else if (configured) {
    items.push(
      item(
        "wallet_auth",
        "Wallet and Google zkLogin authentication",
        "configuration_validated",
        "Sign in is configured but no authenticated session has been exercised. Record founder execution evidence.",
        "browser_auth_not_exercised",
      ),
    );
    pushFailure("browser_auth_not_exercised");
  } else {
    items.push(
      item(
        "wallet_auth",
        "Wallet and Google zkLogin authentication",
        "missing",
        "Configure NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID or enabled wallet authentication for staging",
        "browser_auth_unconfigured",
      ),
    );
    pushFailure("browser_auth_unconfigured");
  }

  // 3. Sovereign PostgreSQL
  const dbUrl = envTrimmed(env, "ABRAXAS_SOVEREIGN_PG_URL") || envTrimmed(env, "ABRAXAS_DATABASE_URL");
  const postgresDirect = envTrimmed(env, "ABRAXAS_PERSISTENCE_BACKEND") === "postgres_direct";
  if (!dbUrl) {
    items.push(
      item(
        "sovereign_pg",
        "Sovereign PostgreSQL connectivity",
        "missing",
        "Set ABRAXAS_SOVEREIGN_PG_URL or ABRAXAS_DATABASE_URL",
        "database_url_missing",
      ),
    );
    pushFailure("database_url_missing");
  } else if (!postgresDirect) {
    items.push(
      item(
        "sovereign_pg",
        "Sovereign PostgreSQL connectivity",
        "configuration_present",
        "Database URL present but ABRAXAS_PERSISTENCE_BACKEND is not postgres_direct",
        "persistence_backend_not_postgres_direct",
      ),
    );
    pushFailure("persistence_backend_not_postgres_direct");
  } else if (!pgConnectivityVerified) {
    items.push(
      item(
        "sovereign_pg",
        "Sovereign PostgreSQL connectivity",
        "configuration_validated",
        "postgres_direct configured but connectivity probe did not succeed",
        "database_connectivity_failed",
      ),
    );
    pushFailure("database_connectivity_failed");
  } else {
    items.push(
      item(
        "sovereign_pg",
        "Sovereign PostgreSQL connectivity",
        "execution_verified",
        "Database connectivity verified with postgres_direct backend",
      ),
    );
  }

  // 4. Migrations 140–143
  const migration = assessMigrationSchema(tableExists, columnExists, pgConnectivityVerified);
  items.push(
    item(
      "migrations_140_143",
      "Migrations 140 through 143",
      migration.phase,
      migration.detail,
      migration.failure_code,
    ),
  );
  pushFailure(migration.failure_code);

  // 5. IDV and human review
  const idvVerdict = evidenceIntegrity?.idv_review;
  const idvTablesReady =
    tableExists("identity_verifications") && tableExists("passport_reusable_credentials");
  if (idvVerdict?.status === "verified") {
    items.push(
      item(
        "idv_review",
        "Authorized identity verification and human review",
        "execution_verified",
        "Authoritative final approval corroborated in identity_verifications",
      ),
    );
  } else if (idvVerdict && idvVerdict.status !== "absent") {
    items.push(
      item(
        "idv_review",
        "Authorized identity verification and human review",
        idvVerdict.status === "blocked_founder" ? "blocked_founder" : "configuration_validated",
        "IDV execution evidence is not corroborated by authoritative review records",
        idvVerdict.code,
      ),
    );
    pushFailure(idvVerdict.code);
  } else if (!idvTablesReady) {
    items.push(
      item(
        "idv_review",
        "Authorized identity verification and human review",
        "missing",
        "Identity verification tables unavailable until migrations and database are ready",
        "idv_schema_unavailable",
      ),
    );
    pushFailure("idv_schema_unavailable");
  } else {
    items.push(
      item(
        "idv_review",
        "Authorized identity verification and human review",
        "blocked_founder",
        "Supply founder execution evidence (idv_human_review) after legitimate operator review. Integration tests do not satisfy this check.",
        "idv_review_pending_founder_evidence",
      ),
    );
    pushFailure("idv_review_pending_founder_evidence");
  }

  // 6. Credential issuer signing authority
  const registry = loadPassportCredentialIssuerRegistry(env);
  const registryValidation = validatePublicCredentialRegistry(registry);
  const signingKeyId = envTrimmed(env, PASSPORT_CREDENTIAL_SIGNING_KEY_ID_ENV) || "passport-credential-issuer";
  if (!envTrimmed(env, "ABRAXAS_PASSPORT_CREDENTIAL_ISSUER_REGISTRY")) {
    items.push(
      item(
        "credential_issuer",
        "Credential issuer signing authority",
        "missing",
        "Configure ABRAXAS_PASSPORT_CREDENTIAL_ISSUER_REGISTRY with public issuer entries",
        "credential_issuer_registry_unconfigured",
      ),
    );
    pushFailure("credential_issuer_registry_unconfigured");
  } else if (!registryValidation.ok) {
    items.push(
      item(
        "credential_issuer",
        "Credential issuer signing authority",
        "configuration_present",
        "Issuer registry env present but entries are invalid or empty",
        registryValidation.code,
      ),
    );
    pushFailure(registryValidation.code);
  } else if (!credentialSigningMaterialAvailable) {
    items.push(
      item(
        "credential_issuer",
        "Credential issuer signing authority",
        "configuration_validated",
        "Public issuer registry validated; signing material not loaded on this host",
        "credential_signing_material_unverified",
      ),
    );
    pushFailure("credential_signing_material_unverified");
  } else if (!operational.credentialSigningMatchesRegistry) {
    items.push(
      item(
        "credential_issuer",
        "Credential issuer signing authority",
        "configuration_validated",
        "Signing material loaded but public key does not match trusted registry entry",
        "credential_signing_registry_mismatch",
      ),
    );
    pushFailure("credential_signing_registry_mismatch");
  } else {
    items.push(
      item(
        "credential_issuer",
        "Credential issuer signing authority",
        "execution_verified",
        "Credential signing public key matches trusted issuer registry entry",
      ),
    );
  }

  // 7. Holder possession registration
  const possessionSchemaOk =
    tableExists("passport_holder_possession_keys")
    && columnExists("passport_holder_possession_keys", "public_key_b64url");
  const possessionVerdict = evidenceIntegrity?.possession;
  if (possessionVerdict?.status === "verified") {
    items.push(
      item(
        "possession_registration",
        "Holder possession registration",
        "execution_verified",
        "Possession registration corroborated in passport_holder_possession_keys",
      ),
    );
  } else if (possessionVerdict && possessionVerdict.status !== "absent") {
    items.push(
      item(
        "possession_registration",
        "Holder possession registration",
        possessionVerdict.status === "blocked_founder" ? "blocked_founder" : "configuration_validated",
        "Possession execution evidence is not corroborated by authoritative storage records",
        possessionVerdict.code,
      ),
    );
    pushFailure(possessionVerdict.code);
  } else if (!possessionSchemaOk) {
    items.push(
      item(
        "possession_registration",
        "Holder possession registration",
        "missing",
        "passport_holder_possession_keys schema not ready",
        "possession_schema_missing",
      ),
    );
    pushFailure("possession_schema_missing");
  } else {
    items.push(
      item(
        "possession_registration",
        "Holder possession registration",
        "configuration_validated",
        "Possession API schema ready; record holder_possession_registered execution evidence after live registration",
        "possession_not_exercised",
      ),
    );
    pushFailure("possession_not_exercised");
  }

  // 8. Revocation publisher and bootstrap trust
  const publisherUrl = envTrimmed(env, PORTABLE_REVOCATION_PUBLISHER_URL_ENV);
  const bootstrapTrusts = loadInstitutionPortableRevocationBootstrapTrusts(env);
  const bootstrapValidation = validateBootstrapTrustStructure(bootstrapTrusts);
  const issuerTrust = loadPortableRevocationIssuerTrustPolicy(env);
  if (!publisherUrl) {
    items.push(
      item(
        "revocation_publisher",
        "Revocation publisher and bootstrap trust",
        "missing",
        `Configure ${PORTABLE_REVOCATION_PUBLISHER_URL_ENV}`,
        "revocation_publisher_url_missing",
      ),
    );
    pushFailure("revocation_publisher_url_missing");
  } else if (!envTrimmed(env, PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS_ENV)) {
    items.push(
      item(
        "revocation_publisher",
        "Revocation publisher and bootstrap trust",
        "configuration_present",
        "Publisher URL configured but bootstrap trusts env missing",
        "bootstrap_trusts_unconfigured",
      ),
    );
    pushFailure("bootstrap_trusts_unconfigured");
  } else if (!bootstrapValidation.ok) {
    items.push(
      item(
        "revocation_publisher",
        "Revocation publisher and bootstrap trust",
        "configuration_present",
        "Bootstrap trusts JSON present but invalid",
        bootstrapValidation.code,
      ),
    );
    pushFailure(bootstrapValidation.code);
  } else if (!issuerTrust?.bindings?.length) {
    items.push(
      item(
        "revocation_publisher",
        "Revocation publisher and bootstrap trust",
        "configuration_validated",
        `Bootstrap trusts valid; configure ${PORTABLE_REVOCATION_ISSUER_TRUST_ENV} for issuer bindings`,
        "portable_revocation_issuer_trust_missing",
      ),
    );
    pushFailure("portable_revocation_issuer_trust_missing");
  } else if (!operational.checkpointDirAccessible) {
    items.push(
      item(
        "revocation_publisher",
        "Revocation publisher and bootstrap trust",
        "configuration_validated",
        `Checkpoint path exists but is not read/write accessible (${PORTABLE_REVOCATION_CHECKPOINT_DIR_ENV})`,
        "revocation_checkpoint_dir_inaccessible",
      ),
    );
    pushFailure("revocation_checkpoint_dir_inaccessible");
  } else if (!operational.publisherSnapshotMatchesBootstrap) {
    items.push(
      item(
        "revocation_publisher",
        "Revocation publisher and bootstrap trust",
        "configuration_validated",
        "Publisher/bootstrap configuration validated; live snapshot does not match trusted bootstrap material",
        "publisher_snapshot_bootstrap_mismatch",
      ),
    );
    pushFailure("publisher_snapshot_bootstrap_mismatch");
  } else {
    items.push(
      item(
        "revocation_publisher",
        "Revocation publisher and bootstrap trust",
        "execution_verified",
        "Publisher snapshot matches bootstrap trust and checkpoint store is accessible",
      ),
    );
  }

  // 9. Institutional partner policies
  if (!policyProbe) {
    items.push(
      item(
        "institutional_policies",
        "Institutional partner and immutable policies",
        "missing",
        "Database policy probe unavailable",
        "institutional_policy_probe_unavailable",
      ),
    );
    pushFailure("institutional_policy_probe_unavailable");
  } else if (policyProbe.active_policy_count < 2) {
    items.push(
      item(
        "institutional_policies",
        "Institutional partner and immutable policies",
        "configuration_present",
        `Only ${policyProbe.active_policy_count} active partner_policies rows (need at least 2 for staging institutions)`,
        "institutional_active_policies_insufficient",
      ),
    );
    pushFailure("institutional_active_policies_insufficient");
  } else if (policyProbe.missing_partner_ids.length > 0) {
    items.push(
      item(
        "institutional_policies",
        "Institutional partner and immutable policies",
        "configuration_validated",
        `Active policies present but missing configured partners: ${policyProbe.missing_partner_ids.join(", ")}`,
        "institutional_required_partners_missing",
      ),
    );
    pushFailure("institutional_required_partners_missing");
  } else {
    items.push(
      item(
        "institutional_policies",
        "Institutional partner and immutable policies",
        "execution_verified",
        `${policyProbe.active_policy_count} active policies across ${policyProbe.active_distinct_partners} partners (read-only catalog probe)`,
      ),
    );
  }

  // 10. Receipt signing and durable replay persistence
  const receiptRegistry = loadReceiptVerificationRegistry(env);
  const signingKeyIdConfigured = Boolean(envTrimmed(env, "ABRAXAS_SIGNING_KEY_ID"));
  if (!envTrimmed(env, RECEIPT_VERIFICATION_REGISTRY_ENV) && !receiptSigningMaterialAvailable) {
    items.push(
      item(
        "receipt_signing_replay",
        "Receipt signing and durable replay persistence",
        "missing",
        "Configure receipt verification registry or signing public material",
        "receipt_registry_unconfigured",
      ),
    );
    pushFailure("receipt_registry_unconfigured");
  } else if (!receiptRegistry.ok) {
    items.push(
      item(
        "receipt_signing_replay",
        "Receipt signing and durable replay persistence",
        "configuration_present",
        "Receipt verification registry present but invalid or unavailable",
        `receipt_registry_${receiptRegistry.reason}`,
      ),
    );
    pushFailure(`receipt_registry_${receiptRegistry.reason}`);
  } else {
    const activeKeys = receiptRegistry.keys.filter((key) => key.status === "active");
    if (activeKeys.length === 0) {
      items.push(
        item(
          "receipt_signing_replay",
          "Receipt signing and durable replay persistence",
          "configuration_validated",
          "Receipt registry parsed but no active verification keys",
          "receipt_registry_no_active_keys",
        ),
      );
      pushFailure("receipt_registry_no_active_keys");
    } else if (!signingKeyIdConfigured) {
      items.push(
        item(
          "receipt_signing_replay",
          "Receipt signing and durable replay persistence",
          "configuration_validated",
          "Active receipt verification keys present; set ABRAXAS_SIGNING_KEY_ID",
          "receipt_signing_key_id_missing",
        ),
      );
      pushFailure("receipt_signing_key_id_missing");
    } else if (!receiptSigningMaterialAvailable) {
      items.push(
        item(
          "receipt_signing_replay",
          "Receipt signing and durable replay persistence",
          "configuration_validated",
          "Receipt registry validated; signing material not verified on this host",
          "receipt_signing_material_unverified",
        ),
      );
      pushFailure("receipt_signing_material_unverified");
    } else if (!operational.receiptSigningMatchesRegistry) {
      items.push(
        item(
          "receipt_signing_replay",
          "Receipt signing and durable replay persistence",
          "configuration_validated",
          "Receipt signing material loaded but public key does not match verification registry",
          "receipt_signing_registry_mismatch",
        ),
      );
      pushFailure("receipt_signing_registry_mismatch");
    } else if (!operational.receiptConsumptionDirAccessible) {
      items.push(
        item(
          "receipt_signing_replay",
          "Receipt signing and durable replay persistence",
          "configuration_validated",
          `Receipt consumption path missing or not read/write accessible (${STAGING_RECEIPT_CONSUMPTION_DIR_ENV})`,
          "receipt_consumption_dir_inaccessible",
        ),
      );
      pushFailure("receipt_consumption_dir_inaccessible");
    } else {
      items.push(
        item(
          "receipt_signing_replay",
          "Receipt signing and durable replay persistence",
          "execution_verified",
          "Receipt signing key matches registry and consumption store is accessible",
        ),
      );
    }
  }

  if (evidenceIntegrity && !evidenceIntegrity.timestamps_valid) {
    pushFailure("staging_evidence_timestamps_invalid");
  }
  if (evidenceIntegrity && !evidenceIntegrity.environment_match) {
    pushFailure("staging_evidence_environment_mismatch");
  }
  for (const code of evidenceIntegrity?.failure_codes ?? []) {
    pushFailure(code);
  }

  const activation_ready = items.every((row) => itemSatisfiedForActivation(row));
  return { items, failure_codes, activation_ready };
}

const ACTIVATION_SCHEMA_ONLY_IDS = new Set(["migrations_140_143"]);

/** Staging activation: exercised flows must be execution_verified; schema installs stop at configuration_validated. */
export function itemSatisfiedForActivation(row: StagingReadinessItem): boolean {
  if (ACTIVATION_SCHEMA_ONLY_IDS.has(row.id)) {
    return row.phase === "configuration_validated" || row.phase === "execution_verified";
  }
  return row.phase === "execution_verified";
}

export function summarizeReadinessPhases(items: StagingReadinessItem[]): Record<ReadinessPhase, number> {
  const summary: Record<ReadinessPhase, number> = {
    missing: 0,
    configuration_present: 0,
    configuration_validated: 0,
    execution_verified: 0,
    blocked_founder: 0,
  };
  for (const row of items) {
    summary[row.phase] += 1;
  }
  return summary;
}
