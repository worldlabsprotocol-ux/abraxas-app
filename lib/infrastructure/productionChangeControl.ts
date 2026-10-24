// FILE: lib/infrastructure/productionChangeControl.ts
// Founder-gated Production infrastructure changes — machine-readable for tests and ops docs.

export type ProductionChangeStatus = "approved" | "conditional" | "suspended" | "hold" | "not_executed";

export type ProductionInfrastructureChange = {
  id: string;
  status: ProductionChangeStatus;
  scope: string;
  reason: string;
  authorized_by?: string;
};

/** Update when founder changes Production infrastructure gates. */
export const PRODUCTION_INFRASTRUCTURE_CHANGES: ProductionInfrastructureChange[] = [
  {
    id: "supabase_migration_058_metering",
    status: "suspended",
    scope: "058_partner_metering_foundation.sql on bztwutzprwsdrtqdpymf",
    reason: "Build #813 — expand Abraxas-operated persistence before Supabase Production DDL (founder 2026-10-24).",
  },
  {
    id: "supabase_migration_065_service_role_grants",
    status: "suspended",
    scope: "065_service_role_runtime_grants.sql after 058",
    reason: "Build #813 — tied to suspended 058; grants follow sovereign datastore plan.",
  },
  {
    id: "supabase_native_account_migrations_144_147",
    status: "hold",
    scope: "144–147 on Production Supabase",
    reason: "Activate only on Abraxas-controlled persistence foundation with recovery proof.",
  },
  {
    id: "production_native_auth_enabled",
    status: "hold",
    scope: "ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED=1 on Production",
    reason: "Schema + session secrets + sovereignty phase gate.",
  },
  {
    id: "commercial_billing_collection",
    status: "hold",
    scope: "Invoicing / enforcement",
    reason: "Separate commercial decision; metering observe-only.",
  },
];

export function getProductionChange(id: string): ProductionInfrastructureChange | undefined {
  return PRODUCTION_INFRASTRUCTURE_CHANGES.find((c) => c.id === id);
}
