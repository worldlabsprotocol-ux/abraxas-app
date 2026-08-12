// FILE: scripts/demo/lib/demoMigrationManifest.ts
// Canonical dependency-ordered migration manifest for an isolated Partner Sandbox demo database.
// Read-only reference — Phase A does not apply migrations.

import { existsSync } from "node:fs";
import { resolve } from "node:path";

const MIGRATIONS_DIR = resolve(process.cwd(), "supabase/migrations");

export type MigrationTier = "required" | "recommended" | "optional";

export interface DemoMigrationEntry {
  file: string;
  tier: MigrationTier;
  creates: string[];
  alters: string[];
  seeds: string[];
  extensions: string[];
  notes: string;
}

/** Tables that must exist for Partner Sandbox demo runtime paths. */
export const DEMO_REQUIRED_TABLES = [
  "identity_verifications",
  "abraxas_credentials",
  "credential_claims",
  "wallet_bindings",
  "partner_policies",
  "partners",
  "verification_requests",
  "verification_decisions",
  "consent_receipts",
  "audit_events",
  "credential_issuers",
  "decision_receipts",
  "credential_status_events",
  "receipt_claim_dependencies",
  "partner_metering_events",
  "partner_entitlements",
  "partner_webhook_configs",
  "partner_webhook_outbox",
  "partner_webhook_delivery_attempts",
] as const;

export const DEMO_OPTIONAL_TABLES = [
  "partner_webhook_dispatch_runs",
  "partner_webhook_retry_audit",
  "partner_webhook_alert_state",
  "decision_receipt_revocation_events",
  "sui_zklogin_identities",
  "identity_verification_events",
] as const;

export const DEMO_SANDBOX_PARTNER_ID = "abraxas-partner-sandbox";
export const DEMO_SANDBOX_POLICY_ID = "partner-sandbox-gate-v1";
export const DEMO_SANDBOX_ISSUER_ID = "issuer:abraxas-sandbox";

export const DEMO_REQUIRED_POLICY_CLAIMS = [
  "identity_verified",
  "wallet_binding_confirmed",
  "screening_outcome",
] as const;

/** Migrations that must never be applied on a fresh Partner Sandbox demo database. */
export const DEMO_EXCLUDED_MIGRATIONS = [
  "028_meridian_relying_partner.sql",
  "029_sandbox_honest_labeling.sql",
  "030_rename_legacy_sandbox_ids.sql",
  "031_cielo_operator_workflow.sql",
  "018_policy_verification_repair.sql",
] as const;

/**
 * Supabase platform prerequisites for a fresh demo project.
 * Do not assume extensions exist because the current Production project has them.
 */
export const DEMO_PLATFORM_PREREQUISITES = {
  postgres: "Supabase hosted PostgreSQL 15+",
  notes: [
    "Migrations 001–005 are not required for Partner Sandbox demo runtime paths.",
    "uuid-ossp is only required by 001_tokenization_requests.sql, which is out of scope.",
    "006_abraxas_id.sql uses gen_random_uuid(); on Supabase PostgreSQL 15+ this is available without pre-enabling uuid-ossp.",
    "pgcrypto is first installed explicitly by 018_policy_verification.sql and later migrations; digest/crypto helpers depend on it.",
  ],
} as const;

/** Extensions that must be present before dependent migrations succeed. */
export const DEMO_REQUIRED_EXTENSIONS = [
  {
    name: "pgcrypto",
    requiredBefore: "018_policy_verification.sql",
    installedBy: "018_policy_verification.sql",
    rationale:
      "Policy engine tables and later receipt/status migrations use pgcrypto helpers; 006 only needs gen_random_uuid() on PG15+.",
  },
] as const;

/**
 * Required migration apply order for a fresh Partner Sandbox demo database.
 * Recommended/optional migrations may be interleaved where noted in the manifest.
 */
export const DEMO_REQUIRED_MIGRATION_ORDER = [
  "006_abraxas_id.sql",
  "007_sui_zklogin.sql",
  "020_identity_verification_state_machine.sql",
  "018_policy_verification.sql",
  "019_trust_registry_complete.sql",
  "024_partner_api_keys.sql",
  "025_partners_registry.sql",
  "032_reconcile_sandbox_and_cielo_operator_workflow.sql",
  "033_decision_receipts.sql",
  "034_credential_status_registry.sql",
  "035_issuer_framework_trust_registry.sql",
  "036_connect_wallet_authority.sql",
  "053_partner_flow_idempotency.sql",
  "055_policy_immutable_versions.sql",
  "056_publish_partner_policy_draft_rpc.sql",
  "058_partner_metering_foundation.sql",
  "062_partner_webhook_outbox.sql",
  "065_service_role_runtime_grants.sql",
] as const;

export const DEMO_MIGRATION_065_FILENAME = "065_service_role_runtime_grants.sql" as const;

/**
 * Fresh-database migration apply order.
 * Do not run 028–031 when 032 is applied. Do not run 018_policy_verification_repair.
 */
export const DEMO_MIGRATION_MANIFEST: DemoMigrationEntry[] = [
  {
    file: "006_abraxas_id.sql",
    tier: "required",
    creates: ["identity_verifications", "abraxas_credentials", "credential_presentations"],
    alters: [],
    seeds: [],
    extensions: [],
    notes: "Creates identity_verifications and abraxas_credentials. Introduces permissive anon RLS policies that demo hardening should later review.",
  },
  {
    file: "007_sui_zklogin.sql",
    tier: "required",
    creates: ["sui_zklogin_identities"],
    alters: ["identity_verifications.sui_address", "identity_verifications.user_email", "abraxas_credentials.sui_address"],
    seeds: [],
    extensions: [],
    notes: "Sui holder columns used by issueIdentityCredential and getHolderCredentialStatus.",
  },
  {
    file: "011_veriff_session_intent.sql",
    tier: "recommended",
    creates: [],
    alters: ["identity_verifications.veriff_session_id"],
    seeds: [],
    extensions: [],
    notes: "Veriff session column; not required for synthetic CLI holder but low-cost on fresh DB.",
  },
  {
    file: "020_identity_verification_state_machine.sql",
    tier: "required",
    creates: ["identity_verification_events", "wallet_binding_challenges"],
    alters: [
      "identity_verifications.identity_verification_status",
      "identity_verifications.credential_status",
      "identity_verifications.veriff_decision_id",
      "identity_verifications.credential_issued_at",
    ],
    seeds: [],
    extensions: [],
    notes: "State machine columns used by transitionIdentityVerification / issueIdentityCredential.",
  },
  {
    file: "018_policy_verification.sql",
    tier: "required",
    creates: [
      "wallet_bindings",
      "credential_claims",
      "partner_policies",
      "verification_requests",
      "consent_receipts",
      "verification_decisions",
      "audit_events",
    ],
    alters: [],
    seeds: ["abraxas-core-v1", "abraxas-booking-v1", "abraxas-rwa-us-v1"],
    extensions: ["pgcrypto"],
    notes: "Core policy engine. Service-role-only RLS (no client policies).",
  },
  {
    file: "019_trust_registry_complete.sql",
    tier: "required",
    creates: ["subjects", "credential_issuers", "credential_schemas"],
    alters: [],
    seeds: ["issuer:veriff", "issuer:abraxas", "issuer:manual"],
    extensions: [],
    notes: "Prerequisite for 035 issuer framework and sandbox issuer seed.",
  },
  {
    file: "024_partner_api_keys.sql",
    tier: "required",
    creates: ["partner_api_keys", "partner_api_usage"],
    alters: [],
    seeds: [],
    extensions: [],
    notes: "025 alters partner_api_usage; required before partners registry.",
  },
  {
    file: "025_partners_registry.sql",
    tier: "required",
    creates: ["partners"],
    alters: ["partner_api_usage"],
    seeds: [],
    extensions: [],
    notes: "Partner org registry; FK target for webhook configs and metering.",
  },
  {
    file: "032_reconcile_sandbox_and_cielo_operator_workflow.sql",
    tier: "required",
    creates: ["external_asset_applications", "cielo_verified_rate_requests"],
    alters: ["partners", "partner_policies"],
    seeds: [DEMO_SANDBOX_PARTNER_ID, DEMO_SANDBOX_POLICY_ID],
    extensions: [],
    notes: "Canonical sandbox partner/policy seed. Supersedes 028–031.",
  },
  {
    file: "033_decision_receipts.sql",
    tier: "required",
    creates: ["decision_receipts"],
    alters: [],
    seeds: [],
    extensions: ["pgcrypto"],
    notes: "Signed receipts for issuePartnerSessionReceipt and getPublicReceipt.",
  },
  {
    file: "034_credential_status_registry.sql",
    tier: "required",
    creates: ["credential_status_events", "receipt_claim_dependencies"],
    alters: ["credential_claims.status_updated_at", "credential_claims.status"],
    seeds: [],
    extensions: ["pgcrypto"],
    notes: "Live trust evaluation dependencies for public receipt validation.",
  },
  {
    file: "035_issuer_framework_trust_registry.sql",
    tier: "required",
    creates: ["issuer_signing_keys", "partner_issuer_trust_rules", "issuer_audit_events"],
    alters: ["credential_issuers.display_name", "credential_issuers.issuer_status"],
    seeds: [DEMO_SANDBOX_ISSUER_ID],
    extensions: ["pgcrypto"],
    notes: "Sandbox issuer registration for applySandboxScreeningClear.",
  },
  {
    file: "036_connect_wallet_authority.sql",
    tier: "required",
    creates: ["connect_authorization_requests"],
    alters: ["wallet_bindings.binding_status", "wallet_bindings.chain_id"],
    seeds: [],
    extensions: ["pgcrypto"],
    notes: "Extends wallet_bindings; upsertWalletBinding expects active binding rows.",
  },
  {
    file: "037_active_wallet_unique.sql",
    tier: "recommended",
    creates: [],
    alters: [],
    seeds: [],
    extensions: [],
    notes: "idx_wallet_bindings_active_wallet_unique — prevents duplicate active wallets.",
  },
  {
    file: "053_partner_flow_idempotency.sql",
    tier: "required",
    creates: [],
    alters: ["verification_decisions.idempotency_key"],
    seeds: [],
    extensions: [],
    notes: "Partner Flow idempotency for issuePartnerSessionReceipt replay.",
  },
  {
    file: "055_policy_immutable_versions.sql",
    tier: "required",
    creates: [],
    alters: ["partner_policies primary key (id, version)"],
    seeds: [],
    extensions: [],
    notes: "Immutable policy versions; getPartnerPolicyAtVersion compatibility.",
  },
  {
    file: "056_publish_partner_policy_draft_rpc.sql",
    tier: "required",
    creates: ["publish_partner_policy_draft RPC"],
    alters: [],
    seeds: [],
    extensions: [],
    notes: "Policy publish RPC referenced by policy versioning layer.",
  },
  {
    file: "058_partner_metering_foundation.sql",
    tier: "required",
    creates: ["partner_metering_events", "partner_entitlements"],
    alters: [],
    seeds: [],
    extensions: [],
    notes: "Metering hooks (observe-only defaults) used by maybeLogPartnerUsage.",
  },
  {
    file: "059_decision_receipt_revocation_events.sql",
    tier: "optional",
    creates: ["decision_receipt_revocation_events"],
    alters: [],
    seeds: [],
    extensions: [],
    notes: "Future cleanup/revocation path; not required for Phase 1 demo rehearsal.",
  },
  {
    file: "062_partner_webhook_outbox.sql",
    tier: "required",
    creates: ["partner_webhook_configs", "partner_webhook_outbox", "partner_webhook_delivery_attempts"],
    alters: [],
    seeds: [],
    extensions: [],
    notes: "Webhook outbox for maybeEnqueuePartnerReceiptIssued (delivery disabled by default).",
  },
  {
    file: "063_partner_webhook_operator_ops.sql",
    tier: "optional",
    creates: ["partner_webhook_dispatch_runs", "partner_webhook_retry_audit"],
    alters: [],
    seeds: [],
    extensions: [],
    notes: "Operator telemetry; optional for Phase 1 presenter flow.",
  },
  {
    file: "064_partner_webhook_alert_state.sql",
    tier: "optional",
    creates: ["partner_webhook_alert_state"],
    alters: [],
    seeds: [],
    extensions: [],
    notes: "Alert state RPCs; optional when alerts disabled.",
  },
  {
    file: "065_service_role_runtime_grants.sql",
    tier: "required",
    creates: [],
    alters: [],
    seeds: [],
    extensions: [],
    notes:
      "Explicit per-table service_role grants after catalog evidence. Does not enable automatic table exposure.",
  },
];

/** Map of which migration file first creates each core object. */
export const OBJECT_PROVENANCE: Record<string, string> = {
  identity_verifications: "006_abraxas_id.sql",
  abraxas_credentials: "006_abraxas_id.sql",
  credential_claims: "018_policy_verification.sql",
  wallet_bindings: "018_policy_verification.sql",
  partners: "025_partners_registry.sql",
  partner_policies: "018_policy_verification.sql",
  verification_requests: "018_policy_verification.sql",
  verification_decisions: "018_policy_verification.sql",
  decision_receipts: "033_decision_receipts.sql",
  credential_status_events: "034_credential_status_registry.sql",
  receipt_claim_dependencies: "034_credential_status_registry.sql",
  credential_issuers: "019_trust_registry_complete.sql",
  partner_metering_events: "058_partner_metering_foundation.sql",
  partner_entitlements: "058_partner_metering_foundation.sql",
  partner_webhook_outbox: "062_partner_webhook_outbox.sql",
  partner_webhook_configs: "062_partner_webhook_outbox.sql",
};

export function getDemoManifestFilenames(): string[] {
  return DEMO_MIGRATION_MANIFEST.map((entry) => entry.file);
}

export function getRequiredDemoManifestFilenames(): string[] {
  return DEMO_MIGRATION_MANIFEST.filter((entry) => entry.tier === "required").map((entry) => entry.file);
}

export function validateDemoMigrationManifest(): string[] {
  const errors: string[] = [];

  for (const file of DEMO_REQUIRED_MIGRATION_ORDER) {
    if (!existsSync(resolve(MIGRATIONS_DIR, file))) {
      errors.push(`Required migration file missing from supabase/migrations: ${file}`);
    }
  }

  for (const entry of DEMO_MIGRATION_MANIFEST) {
    if (!existsSync(resolve(MIGRATIONS_DIR, entry.file))) {
      errors.push(`Manifest migration file missing from supabase/migrations: ${entry.file}`);
    }
  }

  for (const excluded of DEMO_EXCLUDED_MIGRATIONS) {
    if (DEMO_MIGRATION_MANIFEST.some((entry) => entry.file === excluded)) {
      errors.push(`Excluded migration must not appear in manifest: ${excluded}`);
    }
  }

  const requiredInManifest = new Set(getRequiredDemoManifestFilenames());
  for (const file of DEMO_REQUIRED_MIGRATION_ORDER) {
    if (!requiredInManifest.has(file)) {
      errors.push(`Required migration order entry is not marked required in manifest: ${file}`);
    }
  }

  const manifestIndex = new Map<string, number>();
  DEMO_MIGRATION_MANIFEST.forEach((entry, index) => manifestIndex.set(entry.file, index));

  for (let i = 1; i < DEMO_REQUIRED_MIGRATION_ORDER.length; i += 1) {
    const previous = DEMO_REQUIRED_MIGRATION_ORDER[i - 1];
    const current = DEMO_REQUIRED_MIGRATION_ORDER[i];
    const previousIndex = manifestIndex.get(previous);
    const currentIndex = manifestIndex.get(current);
    if (previousIndex === undefined || currentIndex === undefined) {
      errors.push(`Required migration order references unknown manifest entry: ${previous} -> ${current}`);
      continue;
    }
    if (currentIndex < previousIndex) {
      errors.push(`Manifest order violates dependency order (${previous} must precede ${current})`);
    }
  }

  const provenanceTables = Object.keys(OBJECT_PROVENANCE);
  for (const table of DEMO_REQUIRED_TABLES) {
    if (!provenanceTables.includes(table) && !["consent_receipts", "partner_webhook_delivery_attempts"].includes(table)) {
      // consent_receipts and delivery attempts are created by required migrations but not in provenance map yet
    }
  }

  return errors;
}

export function validateDemoMigrationDependencies(): string[] {
  const errors: string[] = [];
  const createsByMigration = new Map<string, Set<string>>();

  for (const entry of DEMO_MIGRATION_MANIFEST) {
    createsByMigration.set(entry.file, new Set(entry.creates));
  }

  const dependencyRules: Array<{ migration: string; requiresTables: string[] }> = [
    { migration: "007_sui_zklogin.sql", requiresTables: ["identity_verifications"] },
    { migration: "020_identity_verification_state_machine.sql", requiresTables: ["identity_verifications"] },
    { migration: "018_policy_verification.sql", requiresTables: [] },
    { migration: "025_partners_registry.sql", requiresTables: ["partner_api_usage"] },
    { migration: "032_reconcile_sandbox_and_cielo_operator_workflow.sql", requiresTables: ["partners", "partner_policies"] },
    { migration: "033_decision_receipts.sql", requiresTables: ["verification_decisions", "consent_receipts"] },
    { migration: "053_partner_flow_idempotency.sql", requiresTables: ["verification_decisions"] },
    { migration: "062_partner_webhook_outbox.sql", requiresTables: ["partners"] },
  ];

  const createdSoFar = new Set<string>();
  const orderedFiles = [...DEMO_REQUIRED_MIGRATION_ORDER];

  for (const file of orderedFiles) {
    const rule = dependencyRules.find((item) => item.migration === file);
    if (rule) {
      for (const table of rule.requiresTables) {
        if (!createdSoFar.has(table)) {
          errors.push(`${file} requires table ${table} before apply`);
        }
      }
    }

    const created = createsByMigration.get(file);
    if (created) {
      for (const table of created) {
        if (!table.includes(" RPC")) createdSoFar.add(table);
      }
    }

    const entry = DEMO_MIGRATION_MANIFEST.find((item) => item.file === file);
    if (entry) {
      for (const table of entry.alters) {
        const tableName = table.split(".")[0]?.split(" ")[0];
        if (tableName && !createdSoFar.has(tableName)) {
          errors.push(`${file} alters ${tableName} before it is created`);
        }
      }
    }
  }

  return errors;
}
