// FILE: lib/databaseRecovery/pgInventory.ts

import type { RecoveryIntegrityFingerprints, RecoveryInventoryRow } from "./fingerprints";
import { RECOVERY_INTEGRITY_SQL, RECOVERY_INVENTORY_SQL } from "./fingerprints";

export interface PgQueryable {
  query<T = unknown>(sql: string): Promise<{ rows: T[] }>;
}

const FULL_INVENTORY_TABLES = [
  "identity_verifications",
  "identity_verification_events",
  "abraxas_credentials",
  "abraxas_evidence_custody",
  "abraxas_evidence_access_audit",
  "passport_idv_consent_records",
  "sovereign_credential_issuance_audit",
  "credential_claims",
  "passport_documents",
  "identity_review_sessions",
  "identity_biometric_assessments",
  "identity_review_audit_log",
  "age_evidence_records",
  "passport_holder_subjects",
  "passport_holder_wallet_accounts",
  "passport_holder_legacy_links",
  "sui_zklogin_identities",
  "decision_receipts",
  "audit_events",
] as const;

/** Live Demo partner DB (`ocntwbxarpjeixdnzide`) — subset verified 2026-10-26. Full pg_dump still captures all public objects. */
export const DEMO_PARTNER_INVENTORY_TABLES = [
  "identity_verifications",
  "identity_verification_events",
  "abraxas_credentials",
  "credential_claims",
  "passport_holder_subjects",
  "passport_holder_wallet_accounts",
  "passport_holder_legacy_links",
  "sui_zklogin_identities",
  "decision_receipts",
  "audit_events",
] as const;

export type RecoveryInventoryProfile = "full" | "demo_partner";

export function resolveRecoveryInventoryProfile(
  env: Record<string, string | undefined> = process.env,
): RecoveryInventoryProfile {
  const explicit = env.ABRAXAS_BACKUP_INVENTORY_PROFILE?.trim();
  if (explicit === "demo_partner" || explicit === "full") return explicit;
  const demoRef = env.DEMO_SUPABASE_PROJECT_REF?.trim();
  if (demoRef === "ocntwbxarpjeixdnzide") return "demo_partner";
  return "full";
}

function inventoryTablesForProfile(profile: RecoveryInventoryProfile): readonly string[] {
  return profile === "demo_partner" ? DEMO_PARTNER_INVENTORY_TABLES : FULL_INVENTORY_TABLES;
}

export async function probeRecoveryInventoryReady(
  client: PgQueryable,
  profile: RecoveryInventoryProfile = "full",
): Promise<boolean> {
  const tables = inventoryTablesForProfile(profile);
  const list = tables.map((t) => `'${t}'`).join(", ");
  const result = await client.query<{ n: string }>(`
    select count(*)::text as n from information_schema.tables
    where table_schema = 'public' and table_name in (${list});
  `);
  return result.rows[0]?.n === String(tables.length);
}

export async function fetchRecoveryInventory(client: PgQueryable): Promise<RecoveryInventoryRow[]> {
  const result = await client.query<RecoveryInventoryRow>(RECOVERY_INVENTORY_SQL);
  return result.rows;
}

export async function fetchRecoveryIntegrity(client: PgQueryable): Promise<RecoveryIntegrityFingerprints> {
  const statements = RECOVERY_INTEGRITY_SQL.split(";").map((s) => s.trim()).filter(Boolean);
  const idv = await client.query<{ idv_aggregate: string }>(statements[0]!);
  const subjects = await client.query<{ subjects_aggregate: string }>(statements[1]!);
  const wallets = await client.query<{ wallets_aggregate: string }>(statements[2]!);
  return {
    idv_aggregate: idv.rows[0]?.idv_aggregate ?? "",
    subjects_aggregate: subjects.rows[0]?.subjects_aggregate ?? "",
    wallets_aggregate: wallets.rows[0]?.wallets_aggregate ?? "",
  };
}

export async function fetchSupabaseMigrationVersions(client: PgQueryable): Promise<string[]> {
  try {
    const result = await client.query<{ version: string; name: string }>(
      "select version, name from supabase_migrations.schema_migrations order by version",
    );
    return result.rows.map((r) => `${r.version}:${r.name}`);
  } catch {
    return [];
  }
}
