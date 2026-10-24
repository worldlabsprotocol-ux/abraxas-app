// FILE: lib/infrastructure/trustBoundaryInventory.ts
// Concrete Supabase / persistence dependency map for Abraxas trust surfaces.

export type DependencyCategory =
  | "replaceable_storage"
  | "auth_authorization_state"
  | "cryptographic_verification"
  | "external_trust_root"
  | "legacy_unnecessary";

export type TrustBoundaryDependency = {
  id: string;
  surface: string;
  category: DependencyCategory;
  persistence_tables?: string[];
  transport: "postgrest" | "postgres_direct" | "pg_hybrid" | "memory_test_only" | "none";
  /** Fails closed for protected actions when unavailable. */
  fail_closed: boolean;
  /** Can a relying party validate without this store at decision time? */
  offline_capable: boolean;
  notes: string;
};

/** Static inventory — update when new persistence call sites land. */
export const TRUST_BOUNDARY_DEPENDENCIES: TrustBoundaryDependency[] = [
  {
    id: "native_account_webauthn",
    surface: "Native passkey accounts (abx_ac_*), WebAuthn challenges, passkeys",
    category: "auth_authorization_state",
    persistence_tables: [
      "abraxas_accounts",
      "abraxas_account_passkeys",
      "abraxas_webauthn_challenges",
    ],
    transport: "postgrest",
    fail_closed: true,
    offline_capable: false,
    notes: "Facade: lib/auth/nativeAccount/store.ts via requirePersistenceAdmin. Memory store test-only.",
  },
  {
    id: "native_membership_sandbox",
    surface: "Operator memberships, sandbox enrollments, membership grants",
    category: "auth_authorization_state",
    persistence_tables: [
      "abraxas_account_partner_memberships",
      "abraxas_sandbox_enrollments",
      "abraxas_account_partner_membership_grants",
    ],
    transport: "postgrest",
    fail_closed: true,
    offline_capable: false,
    notes: "Launchpad operator JWT scoped by assertPartnerMembership.",
  },
  {
    id: "browser_holder_session",
    surface: "Passport holder browser session (abx_hs_*), httpOnly cookie",
    category: "auth_authorization_state",
    persistence_tables: ["passport_holder_subjects", "passport_holder_wallet_accounts", "sui_zklogin_identities"],
    transport: "postgrest",
    fail_closed: true,
    offline_capable: false,
    notes: "Cookie minted after verified id_token; not derived from localStorage alone.",
  },
  {
    id: "partner_console_session",
    surface: "Partner console / API key authorization",
    category: "auth_authorization_state",
    persistence_tables: ["partners", "partner_api_keys"],
    transport: "postgrest",
    fail_closed: true,
    offline_capable: false,
    notes: "Distinct from native account and holder sessions.",
  },
  {
    id: "policy_evaluation",
    surface: "Policy versions, partner policy binding, eligibility evaluation",
    category: "auth_authorization_state",
    persistence_tables: ["partner_policies", "policy_versions"],
    transport: "postgrest",
    fail_closed: true,
    offline_capable: false,
    notes: "Authorization-now checks require fresh policy rows.",
  },
  {
    id: "credential_issuance_status",
    surface: "Credential claims, issuance, revocation status",
    category: "auth_authorization_state",
    persistence_tables: ["credential_claims", "passport_reusable_credentials"],
    transport: "pg_hybrid",
    fail_closed: true,
    offline_capable: false,
    notes: "Hybrid direct pg when ABRAXAS_PASSPORT_TRANSACTION_PG enabled.",
  },
  {
    id: "decision_receipt_signing",
    surface: "Signed decision receipt issuance",
    category: "cryptographic_verification",
    transport: "none",
    fail_closed: true,
    offline_capable: true,
    notes: "Ed25519 via ABRAXAS_SIGNING_KEY — Abraxas-owned, not Supabase.",
  },
  {
    id: "decision_receipt_signature_verify",
    surface: "Independent receipt signature verification",
    category: "cryptographic_verification",
    transport: "none",
    fail_closed: false,
    offline_capable: true,
    notes: "verifyReceiptSignature / verifyReceiptIndependently — no DB required for signature authenticity.",
  },
  {
    id: "receipt_current_validity",
    surface: "Current validity (revocation, supersession, partner suspension)",
    category: "auth_authorization_state",
    persistence_tables: ["decision_receipts", "partners"],
    transport: "postgrest",
    fail_closed: true,
    offline_capable: false,
    notes: "evaluateReceiptCurrentValidity — fails closed when DB unreachable.",
  },
  {
    id: "issuer_trust_registry",
    surface: "Issuer keys, rotation, trust registry material",
    category: "cryptographic_verification",
    transport: "postgrest",
    fail_closed: false,
    offline_capable: true,
    notes: "Public JWK distribution can be cached; rotation requires fresh registry fetch.",
  },
  {
    id: "integration_telemetry",
    surface: "Partner webhooks, activity signals, Launchpad activity",
    category: "replaceable_storage",
    persistence_tables: ["partner_webhook_outbox", "partner_launchpad_activity"],
    transport: "postgrest",
    fail_closed: false,
    offline_capable: false,
    notes: "Operational telemetry — not a cryptographic trust root.",
  },
  {
    id: "partner_flow_metering_ledger",
    surface: "Observe-only receipt issuance metering (partner_metering_events)",
    category: "replaceable_storage",
    persistence_tables: ["partner_metering_events", "partner_entitlements"],
    transport: "postgrest",
    fail_closed: false,
    offline_capable: false,
    notes:
      "Best-effort insert on issued approved receipts; idempotent keys. Not a trust root. "
      + "Production Supabase 058/065 suspended (Build #813) — ledger must land on Abraxas-operated Postgres.",
  },
  {
    id: "supabase_branded_transport",
    surface: "Supabase PostgREST client as persistence transport",
    category: "legacy_unnecessary",
    transport: "postgrest",
    fail_closed: true,
    offline_capable: false,
    notes: "Replaceable with self-hosted PostgREST or postgres_direct; data remains PostgreSQL.",
  },
  {
    id: "google_zklogin",
    surface: "Google OAuth / Sui zkLogin holder path",
    category: "external_trust_root",
    transport: "postgrest",
    fail_closed: true,
    offline_capable: false,
    notes: "Legacy holder onboarding — separate from abx_ac_* native accounts.",
  },
];

export function listDependenciesByCategory(
  category: DependencyCategory,
): TrustBoundaryDependency[] {
  return TRUST_BOUNDARY_DEPENDENCIES.filter((d) => d.category === category);
}

export function listOperationsBlockedWithoutPersistence(): string[] {
  return TRUST_BOUNDARY_DEPENDENCIES.filter((d) => !d.offline_capable && d.fail_closed).map(
    (d) => d.id,
  );
}
