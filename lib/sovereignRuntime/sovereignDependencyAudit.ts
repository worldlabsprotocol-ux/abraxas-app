// FILE: lib/sovereignRuntime/sovereignDependencyAudit.ts
// Runtime dependency classification for sovereign infrastructure independence (Build #561).

import type { IdvProvider } from "@/lib/idv/idvProvider";
import {
  parseSovereignEnvClass,
  validateEd25519PrivateJwk,
  validateSovereignDatabaseIdentity,
} from "./sovereignActivationPolicy";
import {
  persistenceUsesDirectPostgres,
  resolveIndependentPostgresUrl,
  resolvePersistenceBackend,
} from "@/lib/persistence/env";
import type { SovereignOperationalReadiness } from "./sovereignOperationalReadiness";

export type DependencyClass = "A" | "B" | "C" | "D";

export type SovereignDependencyItem = {
  id: string;
  surface: string;
  dependency_class: DependencyClass;
  sovereign_core: boolean;
  state: "active" | "inactive" | "optional" | "blocked";
  note: string;
};

export type SovereignDependencyAudit = {
  build: 561;
  persistence_backend: string;
  sovereign_env_class: string | null;
  /** Env + static validation only — not observed connectivity. */
  provider_independent_core_configured: boolean;
  /** @deprecated use provider_independent_core_configured */
  provider_independent_core: boolean;
  category_d_in_core: string[];
  items: SovereignDependencyItem[];
};

export type SovereignDependencyAuditObserved = SovereignDependencyAudit & {
  provider_independent_core_operational: boolean;
  operational_readiness: SovereignOperationalReadiness;
};

function hasSupabaseEnv(env: Record<string, string | undefined>): boolean {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

function idvProviderFromEnv(env: Record<string, string | undefined>): IdvProvider {
  const forced = env.IDV_PROVIDER?.trim().toLowerCase();
  if (forced === "manual" || forced === "veriff") return forced;
  return "manual";
}

function hasEvidenceCustody(env: Record<string, string | undefined>): boolean {
  return Boolean(
    env.ABRAXAS_EVIDENCE_STORAGE_ROOT?.trim()
    && env.ABRAXAS_EVIDENCE_ENCRYPTION_KEY?.trim(),
  );
}

/** Classify runtime dependencies; never emits secret values. */
export function buildSovereignDependencyAudit(
  env: Record<string, string | undefined> = process.env,
): SovereignDependencyAudit {
  const backend = resolvePersistenceBackend(env);
  const direct = backend === "postgres_direct";
  const envClass = parseSovereignEnvClass(env);
  const idvProvider = idvProviderFromEnv(env);
  const idvIndependent = idvProvider === "manual";
  const signingOk = validateEd25519PrivateJwk(env.ABRAXAS_SIGNING_KEY);
  const identityErr = validateSovereignDatabaseIdentity(env);
  const pgUrl = resolveIndependentPostgresUrl(env);

  const items: SovereignDependencyItem[] = [
    {
      id: "native_passkey_accounts",
      surface: "Native Abraxas accounts (abx_ac_* passkeys, WebAuthn challenges)",
      dependency_class: direct ? "A" : "B",
      sovereign_core: true,
      state: direct && pgUrl && !identityErr ? "active" : direct ? "blocked" : "inactive",
      note: "lib/auth/nativeAccount/store.ts — PostgreSQL tables 144/145; not Google-derived subjects",
    },
    {
      id: "wallet_auth_challenges",
      surface: "Identity and session (EVM/Solana wallet challenges, holder subjects)",
      dependency_class: direct ? "A" : "B",
      sovereign_core: true,
      state: direct && pgUrl && !identityErr ? "active" : direct ? "blocked" : "inactive",
      note: direct
        ? "postgres_direct + portable SQL migrations"
        : "PostgREST adapter until postgres_direct cutover",
    },
    {
      id: "postgres_persistence",
      surface: "PostgreSQL persistence",
      dependency_class: direct ? "B" : "D",
      sovereign_core: true,
      state: direct && pgUrl ? "active" : direct ? "blocked" : "active",
      note: direct
        ? "Wire-protocol PostgreSQL operated by Abraxas (commodity Postgres engine)"
        : "Supabase PostgREST / hosted API as persistence transport",
    },
    {
      id: "evidence_custody",
      surface: "Encrypted evidence storage",
      dependency_class: "A",
      sovereign_core: true,
      state: hasEvidenceCustody(env) ? "active" : "blocked",
      note: "Filesystem AES-256-GCM via ABRAXAS_EVIDENCE_STORAGE_ROOT",
    },
    {
      id: "credential_issuance",
      surface: "Credential issuance (manual review path)",
      dependency_class: "A",
      sovereign_core: true,
      state: idvIndependent && signingOk && direct ? "active" : idvIndependent ? "blocked" : "inactive",
      note: "Abraxas Verify + sovereign admin review; no Veriff required",
    },
    {
      id: "signing_authority",
      surface: "Signing and key authority (decision receipts, credentials)",
      dependency_class: "A",
      sovereign_core: true,
      state: signingOk ? "active" : "blocked",
      note: "Ed25519 private JWK in ABRAXAS_SIGNING_KEY (Abraxas-controlled rotation)",
    },
    {
      id: "policy_evaluation",
      surface: "Policy evaluation and scoped authorization",
      dependency_class: "A",
      sovereign_core: true,
      state: direct && signingOk ? "active" : "blocked",
      note: "In-process policy + claims store on PostgreSQL",
    },
    {
      id: "receipt_verify",
      surface: "Receipt issuance and independent verification",
      dependency_class: "A",
      sovereign_core: true,
      state: signingOk ? "active" : "blocked",
      note: "verifyReceiptIndependently — no Supabase or hosted verifier API",
    },
    {
      id: "revocation_replay",
      surface: "Revocation and replay protection",
      dependency_class: "A",
      sovereign_core: true,
      state: direct && pgUrl ? "active" : "blocked",
      note: "Credential claims + presentation consumption in PostgreSQL",
    },
    {
      id: "backup_recovery",
      surface: "Backups and recovery",
      dependency_class: "A",
      sovereign_core: true,
      state: env.ABRAXAS_BACKUP_ENCRYPTION_KEY?.trim() ? "active" : "optional",
      note: "Build #552 encrypted pg_dump + manifest; restore to independent Postgres",
    },
    {
      id: "monitoring_admin",
      surface: "Monitoring and administration",
      dependency_class: "A",
      sovereign_core: false,
      state: "active",
      note: "GET /api/sovereign/health, admin review queue (direct or legacy)",
    },
    {
      id: "veriff_idv",
      surface: "Managed verification (Veriff)",
      dependency_class: "D",
      sovereign_core: false,
      state: idvProvider === "veriff" ? "active" : "inactive",
      note: "Opt-in legacy; excluded from sovereign core when IDV_PROVIDER=manual (default)",
    },
    {
      id: "supabase_transport",
      surface: "Supabase PostgREST / Auth",
      dependency_class: "D",
      sovereign_core: !direct,
      state: hasSupabaseEnv(env) ? "active" : "inactive",
      note: "Compatibility/demo transport — forbidden on sovereign staging activation",
    },
    {
      id: "sui_zklogin",
      surface: "Sui zkLogin / Google-hosted wallet",
      dependency_class: "D",
      sovereign_core: false,
      state: env.NEXT_PUBLIC_SUI_CLIENT_ID?.trim() ? "optional" : "inactive",
      note: "Legacy holder path; wallet-native EVM/Solana auth is sovereign-default",
    },
    {
      id: "onchain_stamps",
      surface: "Optional on-chain stamps (Sui)",
      dependency_class: "C",
      sovereign_core: false,
      state: "optional",
      note: "Commodity chain RPC; not required for offline receipt verification",
    },
    {
      id: "hosting_edge",
      surface: "Application hosting (e.g. Vercel)",
      dependency_class: "C",
      sovereign_core: false,
      state: env.VERCEL ? "optional" : "inactive",
      note: "Commodity HTTP runtime; trust semantics live in PostgreSQL + keys + evidence",
    },
  ];

  const category_d_in_core = items
    .filter((i) => i.sovereign_core && i.dependency_class === "D" && i.state === "active")
    .map((i) => i.id);

  if (direct && hasSupabaseEnv(env)) {
    category_d_in_core.push("supabase_env_on_direct_backend");
  }
  if (direct && idvProvider === "veriff") {
    category_d_in_core.push("veriff_on_sovereign_core");
  }

  const provider_independent_core_configured =
    direct
    && category_d_in_core.length === 0
    && !identityErr
    && Boolean(pgUrl)
    && hasEvidenceCustody(env)
    && signingOk
    && idvIndependent;

  return {
    build: 561,
    persistence_backend: backend,
    sovereign_env_class: envClass,
    provider_independent_core_configured,
    provider_independent_core: provider_independent_core_configured,
    category_d_in_core,
    items,
  };
}

export async function buildSovereignDependencyAuditObserved(
  env: Record<string, string | undefined> = process.env,
): Promise<SovereignDependencyAuditObserved> {
  const configured = buildSovereignDependencyAudit(env);
  const { observeSovereignOperationalReadiness } = await import("./sovereignOperationalReadiness");
  const operational_readiness = await observeSovereignOperationalReadiness(env);
  const provider_independent_core_operational =
    configured.provider_independent_core_configured && operational_readiness.operational;

  return {
    ...configured,
    provider_independent_core_operational,
    operational_readiness,
  };
}

export function assertSovereignCoreProviderFree(
  env: Record<string, string | undefined> = process.env,
): { ok: boolean; blockers: string[] } {
  const audit = buildSovereignDependencyAudit(env);
  const blockers = Array.from(new Set(audit.category_d_in_core));
  if (!persistenceUsesDirectPostgres(env)) {
    blockers.push("postgres_direct_required");
  }
  for (const item of audit.items) {
    if (item.sovereign_core && item.state === "blocked") {
      blockers.push(`${item.id}_not_ready`);
    }
  }
  return {
    ok: audit.provider_independent_core_configured,
    blockers: Array.from(new Set(blockers)),
  };
}
