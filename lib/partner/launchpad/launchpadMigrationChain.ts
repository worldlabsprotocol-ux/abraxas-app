// FILE: lib/partner/launchpad/launchpadMigrationChain.ts
// Deterministic dependency contract for Launchpad production migration chain.

export interface LaunchpadMigrationChainEntry {
  file: string;
  /** Migrations that must be applied before this one. */
  requires: string[];
  /** Tables that must exist before apply. */
  requiresTables: string[];
  /** table.column pairs that must exist before apply. */
  requiresColumns: Array<{ table: string; column: string; ownerMigration: string }>;
}

/** Canonical apply order from Launchpad foundation through binding production authorization. */
export const LAUNCHPAD_PRODUCTION_MIGRATION_ORDER = [
  "084_partner_launchpad_foundation.sql",
  "085_partner_launchpad_hardening.sql",
  "095_partner_launchpad_production_credential_atomic.sql",
  "099_hosted_partner_flow_handoffs.sql",
  "110_partner_launchpad_activate_production_atomic.sql",
  "119_launchpad_production_schema_repair.sql",
  "116_partner_application_policy_bindings.sql",
  "117_hosted_handoff_policy_binding.sql",
  "118_binding_production_authorization.sql",
] as const;

/**
 * Operator order from the observed drifted production state (084 only):
 * 119 → 085 → 095 → 099 → 110 → 116 → 117 → 118
 *
 * 119 is idempotent and may be skipped when 085/095/110 were fully applied,
 * but running it before 116 is safe on drifted databases missing production_activated_at.
 */
export const LAUNCHPAD_DRIFTED_PRODUCTION_REPAIR_ORDER = [
  "119_launchpad_production_schema_repair.sql",
  "085_partner_launchpad_hardening.sql",
  "095_partner_launchpad_production_credential_atomic.sql",
  "099_hosted_partner_flow_handoffs.sql",
  "110_partner_launchpad_activate_production_atomic.sql",
  "116_partner_application_policy_bindings.sql",
  "117_hosted_handoff_policy_binding.sql",
  "118_binding_production_authorization.sql",
] as const;

export const LAUNCHPAD_MIGRATION_CHAIN: LaunchpadMigrationChainEntry[] = [
  {
    file: "084_partner_launchpad_foundation.sql",
    requires: [],
    requiresTables: ["partners", "partner_api_keys"],
    requiresColumns: [],
  },
  {
    file: "085_partner_launchpad_hardening.sql",
    requires: ["084_partner_launchpad_foundation.sql"],
    requiresTables: ["partner_launchpad_applications"],
    requiresColumns: [],
  },
  {
    file: "095_partner_launchpad_production_credential_atomic.sql",
    requires: ["085_partner_launchpad_hardening.sql"],
    requiresTables: ["partner_launchpad_applications", "partner_api_keys"],
    requiresColumns: [
      { table: "partner_launchpad_applications", column: "production_api_key_id", ownerMigration: "085_partner_launchpad_hardening.sql" },
    ],
  },
  {
    file: "099_hosted_partner_flow_handoffs.sql",
    requires: ["084_partner_launchpad_foundation.sql"],
    requiresTables: ["partner_launchpad_applications"],
    requiresColumns: [],
  },
  {
    file: "110_partner_launchpad_activate_production_atomic.sql",
    requires: [
      "084_partner_launchpad_foundation.sql",
      "085_partner_launchpad_hardening.sql",
      "095_partner_launchpad_production_credential_atomic.sql",
    ],
    requiresTables: ["partner_production_access_requests", "partner_api_keys"],
    requiresColumns: [
      { table: "partner_api_keys", column: "launchpad_application_id", ownerMigration: "095_partner_launchpad_production_credential_atomic.sql" },
    ],
  },
  {
    file: "119_launchpad_production_schema_repair.sql",
    requires: ["084_partner_launchpad_foundation.sql"],
    requiresTables: ["partner_launchpad_applications", "partner_api_keys"],
    requiresColumns: [],
  },
  {
    file: "116_partner_application_policy_bindings.sql",
    requires: [
      "084_partner_launchpad_foundation.sql",
      "110_partner_launchpad_activate_production_atomic.sql",
    ],
    requiresTables: ["partner_launchpad_applications", "partner_policies", "partner_launchpad_activity"],
    requiresColumns: [
      { table: "partner_launchpad_applications", column: "production_activated_at", ownerMigration: "110_partner_launchpad_activate_production_atomic.sql" },
    ],
  },
  {
    file: "117_hosted_handoff_policy_binding.sql",
    requires: ["099_hosted_partner_flow_handoffs.sql"],
    requiresTables: ["hosted_partner_flow_handoffs"],
    requiresColumns: [],
  },
  {
    file: "118_binding_production_authorization.sql",
    requires: [
      "116_partner_application_policy_bindings.sql",
      "110_partner_launchpad_activate_production_atomic.sql",
    ],
    requiresTables: ["partner_launchpad_application_policies", "partner_production_access_requests"],
    requiresColumns: [
      { table: "partner_launchpad_applications", column: "production_activated_at", ownerMigration: "110_partner_launchpad_activate_production_atomic.sql" },
      { table: "partner_api_keys", column: "launchpad_application_id", ownerMigration: "095_partner_launchpad_production_credential_atomic.sql" },
    ],
  },
];

/** Tables assumed to exist before Launchpad foundation (018, 024, 025). */
export const LAUNCHPAD_PLATFORM_PREREQUISITE_TABLES = [
  "partners",
  "partner_api_keys",
  "partner_policies",
] as const;

export function validateLaunchpadMigrationChain(): string[] {
  const errors: string[] = [];
  const known = new Set(LAUNCHPAD_MIGRATION_CHAIN.map((e) => e.file));
  const orderIndex = new Map<string, number>();
  LAUNCHPAD_PRODUCTION_MIGRATION_ORDER.forEach((file, i) => orderIndex.set(file, i));

  for (const entry of LAUNCHPAD_MIGRATION_CHAIN) {
    for (const req of entry.requires) {
      if (!known.has(req)) {
        errors.push(`${entry.file} requires unknown migration ${req}`);
        continue;
      }
      const reqIdx = orderIndex.get(req);
      const entryIdx = orderIndex.get(entry.file);
      if (reqIdx === undefined || entryIdx === undefined) {
        errors.push(`${entry.file} or dependency ${req} missing from LAUNCHPAD_PRODUCTION_MIGRATION_ORDER`);
      } else if (reqIdx >= entryIdx) {
        errors.push(`${entry.file} requires ${req} but manifest order places dependency after dependent`);
      }
    }
  }

  const createdTables = new Set<string>(LAUNCHPAD_PLATFORM_PREREQUISITE_TABLES);
  const createdColumns = new Map<string, Set<string>>();

  for (const file of LAUNCHPAD_PRODUCTION_MIGRATION_ORDER) {
    const entry = LAUNCHPAD_MIGRATION_CHAIN.find((e) => e.file === file);
    if (!entry) continue;

    for (const table of entry.requiresTables) {
      if (!createdTables.has(table)) {
        errors.push(`${file} requires table ${table} before it is created in chain`);
      }
    }

    for (const col of entry.requiresColumns) {
      const cols = createdColumns.get(col.table);
      if (!cols?.has(col.column)) {
        errors.push(`${file} requires ${col.table}.${col.column} (from ${col.ownerMigration}) before apply`);
      }
    }

    if (file === "084_partner_launchpad_foundation.sql") {
      createdTables.add("partner_launchpad_applications");
      createdTables.add("partner_launchpad_activity");
      createdTables.add("partner_production_access_requests");
    }
    if (file === "085_partner_launchpad_hardening.sql") {
      for (const col of ["production_api_key_id", "production_key_revealed_at", "production_key_encrypted"]) {
        const set = createdColumns.get("partner_launchpad_applications") ?? new Set<string>();
        set.add(col);
        createdColumns.set("partner_launchpad_applications", set);
      }
    }
    if (file === "095_partner_launchpad_production_credential_atomic.sql") {
      const set = createdColumns.get("partner_api_keys") ?? new Set<string>();
      set.add("launchpad_application_id");
      createdColumns.set("partner_api_keys", set);
    }
    if (file === "099_hosted_partner_flow_handoffs.sql") {
      createdTables.add("hosted_partner_flow_handoffs");
    }
    if (file === "110_partner_launchpad_activate_production_atomic.sql") {
      const set = createdColumns.get("partner_launchpad_applications") ?? new Set<string>();
      set.add("production_activated_at");
      createdColumns.set("partner_launchpad_applications", set);
    }
    if (file === "119_launchpad_production_schema_repair.sql") {
      for (const col of ["production_api_key_id", "production_key_revealed_at", "production_key_encrypted", "production_activated_at"]) {
        const set = createdColumns.get("partner_launchpad_applications") ?? new Set<string>();
        set.add(col);
        createdColumns.set("partner_launchpad_applications", set);
      }
      const keySet = createdColumns.get("partner_api_keys") ?? new Set<string>();
      keySet.add("launchpad_application_id");
      createdColumns.set("partner_api_keys", keySet);
    }
    if (file === "116_partner_application_policy_bindings.sql") {
      createdTables.add("partner_launchpad_application_policies");
    }
    if (file === "118_binding_production_authorization.sql") {
      createdTables.add("partner_binding_production_access_requests");
      const set = createdColumns.get("partner_launchpad_application_policies") ?? new Set<string>();
      for (const col of ["production_status", "production_authorized_by", "production_suspended_at", "production_suspended_by"]) {
        set.add(col);
      }
      createdColumns.set("partner_launchpad_application_policies", set);
    }
  }

  return errors;
}

/** SQL fragments that must appear in repair migration for drifted-production safety. */
export const LAUNCHPAD_REPAIR_MIGRATION_INVARIANTS = {
  file: "119_launchpad_production_schema_repair.sql",
  mustContain: [
    "ADD COLUMN IF NOT EXISTS production_activated_at",
    "ADD COLUMN IF NOT EXISTS launchpad_application_id",
    "ADD COLUMN IF NOT EXISTS production_api_key_id",
    "production_application_activated",
    "Does NOT create hosted_partner_flow_handoffs",
  ],
  mustNotContain: [
    "DROP TABLE",
    "TRUNCATE",
    "production_activated_at = now()",
    "CREATE TABLE IF NOT EXISTS public.hosted_partner_flow_handoffs",
  ],
} as const;
