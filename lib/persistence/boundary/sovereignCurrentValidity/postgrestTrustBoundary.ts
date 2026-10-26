// FILE: lib/persistence/boundary/sovereignCurrentValidity/postgrestTrustBoundary.ts
// Documents trust-critical paths that still use operational PostgREST vs direct PostgreSQL.

export type TrustPathClass = "direct_pg_authoritative" | "postgrest_operational" | "hybrid_prefer_direct_pg";

export const CURRENT_VALIDITY_TRUST_PATHS: {
  id: string;
  module: string;
  class: TrustPathClass;
  notes: string;
}[] = [
  {
    id: "sovereign_current_validity",
    module: "lib/persistence/boundary/sovereignCurrentValidity/evaluate.ts",
    class: "direct_pg_authoritative",
    notes: "Partner/policy/supersession/claim evidence via querySovereignStagingPg; issuer via signed SIAS.",
  },
  {
    id: "operational_current_validity",
    module: "lib/decisionReceipts/currentValidity/evaluate.ts",
    class: "postgrest_operational",
    notes: "Production/Demo default: Supabase admin + getPartnerPolicyAtVersion.",
  },
  {
    id: "portable_export_validity",
    module: "lib/partner/portableIndependentVerification/evaluatePortableExportCurrentValidity.ts",
    class: "hybrid_prefer_direct_pg",
    notes: "Uses sovereign path when getSovereignStagingPgPool configured; else PostgREST operational mirror.",
  },
  {
    id: "signed_status_publication",
    module: "lib/persistence/boundary/trustDistribution/publishSignedReceiptStatus.ts",
    class: "direct_pg_authoritative",
    notes: "Signed status derived from sovereign evaluation when PG pool present.",
  },
];

/** Slice covered by Build #834 CI — trust-critical reads on direct PG only. */
export const BUILD_834_ELIMINATED_POSTGREST_FOR_SLICE = [
  "sovereign_current_validity",
  "signed_status_publication",
] as const;
