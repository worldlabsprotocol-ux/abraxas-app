// FILE: lib/passport/stagingReadiness571.ts

import { existsSync } from "node:fs";
import { join } from "node:path";

export type ReadinessStatus = "ready" | "missing" | "blocked";

export type StagingReadinessItem = {
  id: string;
  label: string;
  status: ReadinessStatus;
  detail: string;
};

export type StagingReadinessInput = {
  env: Record<string, string | undefined>;
  productionBuildPresent: boolean;
  tableExists: (table: string) => boolean;
};

function envPresent(env: Record<string, string | undefined>, name: string): boolean {
  return Boolean(env[name]?.trim());
}

function zkLoginReady(env: Record<string, string | undefined>): ReadinessStatus {
  const clientId =
    env.NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID?.trim()
    || env.NEXT_PUBLIC_GOOGLE_ZKLOGIN_LEGACY_CLIENT_ID?.trim();
  return clientId ? "ready" : "missing";
}

export function buildStagingReadiness571(input: StagingReadinessInput): StagingReadinessItem[] {
  const { env, productionBuildPresent, tableExists } = input;
  const url = env.ABRAXAS_SOVEREIGN_PG_URL?.trim() ?? env.ABRAXAS_DATABASE_URL?.trim();
  const persistencePostgres = env.ABRAXAS_PERSISTENCE_BACKEND?.trim() === "postgres_direct" && Boolean(url);

  const migrationsPresent =
    existsSync(join(process.cwd(), "supabase/migrations/140_passport_reusable_credential_state.sql"))
    && existsSync(join(process.cwd(), "supabase/migrations/141_passport_institutional_presentation_consent.sql"))
    && existsSync(join(process.cwd(), "supabase/migrations/142_passport_institutional_authorization_commits.sql"))
    && existsSync(join(process.cwd(), "supabase/migrations/143_passport_authorization_signing_claim.sql"));

  return [
    {
      id: "passport_routes",
      label: "Passport routes and production build",
      status: productionBuildPresent ? "ready" : "missing",
      detail: productionBuildPresent
        ? "Production build artifact present"
        : "Run npm run build before staging activation rehearsal",
    },
    {
      id: "wallet_auth",
      label: "Wallet and Google zkLogin authentication",
      status: zkLoginReady(env),
      detail:
        zkLoginReady(env) === "ready"
          ? "Google zkLogin public client id configured"
          : "Set NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID for browser sign in",
    },
    {
      id: "sovereign_pg",
      label: "Sovereign PostgreSQL connectivity",
      status: url ? (persistencePostgres ? "ready" : "blocked") : "missing",
      detail: url
        ? persistencePostgres
          ? "Database URL and postgres_direct backend"
          : "Database URL present but persistence backend is not postgres_direct"
        : "Set sovereign database URL",
    },
    {
      id: "migrations_140_143",
      label: "Migrations 140 through 143",
      status:
        migrationsPresent && tableExists("passport_reusable_credentials")
          ? "ready"
          : migrationsPresent
            ? "missing"
            : "blocked",
      detail: tableExists("passport_reusable_credentials")
        ? "Credential tables present on connected database"
        : "Apply migrations 140 to 143 on isolated database with founder approval for shared staging",
    },
    {
      id: "idv_review",
      label: "Authorized identity verification and human review",
      status: "blocked",
      detail:
        "Requires founder operator credentials and legitimate test IDV. Not automatable in cloud agent without staging access.",
    },
    {
      id: "credential_issuer",
      label: "Credential issuer signing authority",
      status:
        envPresent(env, "ABRAXAS_PASSPORT_CREDENTIAL_ISSUER_REGISTRY")
        && (envPresent(env, "ABRAXAS_PASSPORT_CREDENTIAL_SIGNING_KEY")
          || envPresent(env, "ABRAXAS_PASSPORT_CREDENTIAL_SIGNING_KEY_ID"))
          ? "ready"
          : "missing",
      detail: "Passport credential issuer registry and signing key configuration",
    },
    {
      id: "possession_registration",
      label: "Holder possession registration",
      status: tableExists("passport_holder_possession_keys") ? "ready" : "missing",
      detail: "passport_holder_possession_keys table",
    },
    {
      id: "revocation_publisher",
      label: "Revocation publisher and bootstrap trust",
      status:
        envPresent(env, "ABRAXAS_PORTABLE_REVOCATION_PUBLISHER_URL")
        && envPresent(env, "ABRAXAS_PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS")
          ? "ready"
          : "missing",
      detail: "Publisher URL and institution provisioned bootstrap trusts",
    },
    {
      id: "institutional_policies",
      label: "Institutional partner and immutable policies",
      status: tableExists("partner_policies") ? "ready" : "missing",
      detail: "partner_policies and catalog seed for test institutions",
    },
    {
      id: "receipt_signing_replay",
      label: "Receipt signing and durable replay persistence",
      status:
        envPresent(env, "ABRAXAS_RECEIPT_VERIFICATION_REGISTRY")
        && envPresent(env, "ABRAXAS_SIGNING_KEY_ID")
          ? "ready"
          : "missing",
      detail: "Receipt verification registry and institution verifier consumption or checkpoint dirs",
    },
  ];
}
