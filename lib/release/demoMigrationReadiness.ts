// Read-only migration readiness for Demo Solana stack (134–138).

export const BUILD514_REQUIRED_MIGRATION_FILES = [
  "134_holder_wallet_login.sql",
  "135_canonical_holder_accounts.sql",
  "136_cielo_verified_guest_solana_policy.sql",
  "137_good_trouble_age_21_solana_idv.sql",
  "138_decision_receipt_solana_commitments.sql",
] as const;

/** Tables that must exist after 134–138 on Demo (representative checks). */
export const BUILD514_REQUIRED_TABLES = [
  { id: "134_wallet", table: "holder_wallet_accounts", migration: "134_holder_wallet_login.sql" },
  { id: "134_challenges", table: "holder_wallet_login_challenges", migration: "134_holder_wallet_login.sql" },
  { id: "135_accounts", table: "holder_accounts", migration: "135_canonical_holder_accounts.sql" },
  { id: "138_commitments", table: "decision_receipt_solana_commitments", migration: "138_decision_receipt_solana_commitments.sql" },
] as const;

export type MigrationTableCheck = {
  id: string;
  table: string;
  migration: string;
  present: boolean;
};

export function evaluateMigrationTableChecks(presentTables: readonly string[]): {
  checks: MigrationTableCheck[];
  ready: boolean;
} {
  const set = new Set(presentTables.map(t => t.toLowerCase()));
  const checks = BUILD514_REQUIRED_TABLES.map(row => ({
    id: row.id,
    table: row.table,
    migration: row.migration,
    present: set.has(row.table.toLowerCase()),
  }));
  return { checks, ready: checks.every(c => c.present) };
}
