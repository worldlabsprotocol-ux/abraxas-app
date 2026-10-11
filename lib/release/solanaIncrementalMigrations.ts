// Build #515 — Solana-native incremental migration plan (134–138) for Demo catch-up.

export const SOLANA_INCREMENTAL_MIGRATION_FILES = [
  "134_holder_wallet_login.sql",
  "135_canonical_holder_accounts.sql",
  "136_cielo_verified_guest_solana_policy.sql",
  "137_good_trouble_age_21_solana_idv.sql",
  "138_decision_receipt_solana_commitments.sql",
] as const;

export type SolanaMigrationFile = (typeof SOLANA_INCREMENTAL_MIGRATION_FILES)[number];

export type MigrationGraphNode = {
  file: SolanaMigrationFile;
  creates: string[];
  alters: string[];
  seeds: string[];
  requiresTables: string[];
  requiresExtensions: string[];
  destructiveRisk: "none" | "review";
  notes: string;
};

/** Static dependency graph — prerequisites must exist on Demo before apply. */
export const SOLANA_MIGRATION_GRAPH: MigrationGraphNode[] = [
  {
    file: "134_holder_wallet_login.sql",
    creates: ["holder_wallet_accounts", "holder_wallet_login_challenges"],
    alters: [],
    seeds: [],
    requiresTables: [],
    requiresExtensions: ["pgcrypto"],
    destructiveRisk: "none",
    notes: "Idempotent CREATE IF NOT EXISTS; service_role grants only.",
  },
  {
    file: "135_canonical_holder_accounts.sql",
    creates: ["holder_accounts"],
    alters: ["holder_wallet_accounts.holder_account_id"],
    seeds: [],
    requiresTables: ["holder_wallet_accounts"],
    requiresExtensions: ["pgcrypto"],
    destructiveRisk: "none",
    notes: "Adds FK from wallet accounts to canonical holder_accounts.",
  },
  {
    file: "136_cielo_verified_guest_solana_policy.sql",
    creates: [],
    alters: [],
    seeds: ["partner_policies:cielo-verified-guest-solana-v1"],
    requiresTables: ["partner_policies"],
    requiresExtensions: [],
    destructiveRisk: "none",
    notes: "Upsert policy row only; no identity data.",
  },
  {
    file: "137_good_trouble_age_21_solana_idv.sql",
    creates: [],
    alters: ["identity_verifications.holder_account_id"],
    seeds: ["partner_policies:good-trouble-age_21_retail-solana-v1"],
    requiresTables: ["holder_accounts", "identity_verifications", "partner_policies"],
    requiresExtensions: [],
    destructiveRisk: "none",
    notes: "L2 Solana age policy; links IDV rows to holder_accounts.",
  },
  {
    file: "138_decision_receipt_solana_commitments.sql",
    creates: ["decision_receipt_solana_commitments"],
    alters: [],
    seeds: [],
    requiresTables: ["decision_receipts"],
    requiresExtensions: [],
    destructiveRisk: "none",
    notes: "RLS enabled; service_role only; FK to decision_receipts RESTRICT.",
  },
];

/** Repo migrations 088–133: not required for Solana incremental if objects already present on Demo. */
export const SOLANA_PREREQUISITE_OBJECTS_FROM_EARLIER_MIGRATIONS = [
  { object: "partner_policies", provenance: "018_policy_verification.sql" },
  { object: "identity_verifications", provenance: "006_abraxas_id.sql" },
  { object: "decision_receipts", provenance: "033_decision_receipts.sql" },
  { object: "partner_flow_continuations", provenance: "091_partner_flow_continuations.sql" },
  { object: "reusable_eligibility_facts", provenance: "093_reusable_eligibility_facts.sql" },
] as const;

export type SchemaObjectProbe = {
  name: string;
  present: boolean;
  kind: "table" | "column" | "policy_seed";
};

export type SolanaReadinessEvaluation = {
  migrationHistoryAuthoritative: false;
  incrementalPlan: readonly SolanaMigrationFile[];
  prerequisiteObjects: SchemaObjectProbe[];
  solanaObjects: SchemaObjectProbe[];
  missingPrerequisites: string[];
  missingSolanaObjects: string[];
  presentSolanaObjects: string[];
  partialSolanaActivation: boolean;
  solanaSchemaComplete: boolean;
  readyForIncrementalApply: boolean;
  historyNote: string;
};

export function evaluateSolanaIncrementalReadiness(probe: {
  tablesPresent: readonly string[];
  columnsPresent: readonly string[];
  policyIdsPresent: readonly string[];
}): SolanaReadinessEvaluation {
  const tableSet = new Set(probe.tablesPresent.map(t => t.toLowerCase()));
  const columnSet = new Set(probe.columnsPresent.map(c => c.toLowerCase()));
  const policySet = new Set(probe.policyIdsPresent.map(p => p.toLowerCase()));

  const prerequisiteObjects: SchemaObjectProbe[] = SOLANA_PREREQUISITE_OBJECTS_FROM_EARLIER_MIGRATIONS.map(
    row => ({
      name: row.object,
      present: tableSet.has(row.object.toLowerCase()),
      kind: "table",
    }),
  );

  const solanaTables = [
    "holder_wallet_accounts",
    "holder_wallet_login_challenges",
    "holder_accounts",
    "decision_receipt_solana_commitments",
  ];
  const solanaObjects: SchemaObjectProbe[] = [
    ...solanaTables.map(name => ({
      name,
      present: tableSet.has(name.toLowerCase()),
      kind: "table" as const,
    })),
    {
      name: "identity_verifications.holder_account_id",
      present: columnSet.has("identity_verifications.holder_account_id"),
      kind: "column",
    },
    {
      name: "partner_policies.cielo-verified-guest-solana-v1",
      present: policySet.has("cielo-verified-guest-solana-v1"),
      kind: "policy_seed",
    },
    {
      name: "partner_policies.good-trouble-age_21_retail-solana-v1",
      present: policySet.has("good-trouble-age_21_retail-solana-v1"),
      kind: "policy_seed",
    },
  ];

  const missingPrerequisites = prerequisiteObjects.filter(o => !o.present).map(o => o.name);
  const missingSolanaObjects = solanaObjects.filter(o => !o.present).map(o => o.name);
  const presentSolanaObjects = solanaObjects.filter(o => o.present).map(o => o.name);

  const allSolanaObjectsMissing = missingSolanaObjects.length === solanaObjects.length;
  const solanaSchemaComplete = presentSolanaObjects.length === solanaObjects.length;
  const partialSolanaActivation =
    presentSolanaObjects.length > 0 && presentSolanaObjects.length < solanaObjects.length;

  const readyForIncrementalApply =
    missingPrerequisites.length === 0 && allSolanaObjectsMissing && !partialSolanaActivation;

  return {
    migrationHistoryAuthoritative: false,
    incrementalPlan: SOLANA_INCREMENTAL_MIGRATION_FILES,
    prerequisiteObjects,
    solanaObjects,
    missingPrerequisites,
    missingSolanaObjects,
    presentSolanaObjects,
    partialSolanaActivation,
    solanaSchemaComplete,
    readyForIncrementalApply,
    historyNote:
      "Demo schema_migrations may under-report applied work. Use live catalog probes — do not replay 088–133 when prerequisite tables already exist.",
  };
}

export const VALIDATION_SQL_AFTER_APPLY = [
  "SELECT to_regclass('public.holder_wallet_accounts') IS NOT NULL AS holder_wallet_accounts;",
  "SELECT to_regclass('public.holder_accounts') IS NOT NULL AS holder_accounts;",
  "SELECT column_name FROM information_schema.columns WHERE table_name='identity_verifications' AND column_name='holder_account_id';",
  "SELECT id FROM public.partner_policies WHERE id IN ('cielo-verified-guest-solana-v1','good-trouble-age_21_retail-solana-v1');",
  "SELECT to_regclass('public.decision_receipt_solana_commitments') IS NOT NULL AS solana_commitments;",
] as const;
