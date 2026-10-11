// Build #521 — read-only Demo activation truth (no migrations, no production).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSolanaNativeProductEnabled } from "@/lib/auth/solanaNative/featureFlag";
import { evaluateMigrationTableChecks } from "@/lib/release/demoMigrationReadiness";
import { evaluateDemoSolanaSchemaGate } from "@/lib/release/demoSolanaSchemaGate";
import { assertDemoSupabaseNotProduction } from "@/lib/release/demoEnvironmentSafety";
import { DEMO_SUPABASE_PROJECT_REF } from "@/lib/supabase/projectRefs";
import { CIELO_VERIFIED_GUEST_SOLANA_POLICY_ID } from "@/lib/cielo/cieloSolanaPolicyIds";
import { CIELO_VERIFIED_GUEST_POLICY_ID } from "@/lib/cielo/cieloIds";
import { PUBLIC_DEMO_ORIGIN } from "@/lib/product/publicOrigin";
import { isPublicDemoRuntime } from "@/lib/product/demoRuntime";

export type DemoActivationReadiness = {
  demo_origin: typeof PUBLIC_DEMO_ORIGIN;
  runtime_env: string | null;
  solana_native_enabled: boolean;
  deployment_sha: string | null;
  supabase_project_ref: string | null;
  supabase_binding_ok: boolean;
  migration_table_ready: boolean;
  migration_checks: ReturnType<typeof evaluateMigrationTableChecks>["checks"];
  solana_schema_verdict: string;
  solana_schema_complete: boolean;
  ready_for_incremental_apply: boolean;
  legacy_cielo_policy_present: boolean;
  solana_cielo_policy_present: boolean;
  phantom_cielo_path_ready: boolean;
  blocked_reasons: string[];
  founder_actions: string[];
};

const PROBE_TABLES = [
  "holder_wallet_accounts",
  "holder_wallet_login_challenges",
  "holder_accounts",
  "decision_receipt_solana_commitments",
  "wallet_bindings",
  "partner_policies",
  "user_profiles",
  "consent_receipts",
  "decision_receipts",
];

async function probeTables(client: SupabaseClient): Promise<string[]> {
  const present: string[] = [];
  for (const table of PROBE_TABLES) {
    const { error } = await client.from(table).select("*", { head: true, count: "exact" });
    if (!error) present.push(table);
  }
  return present;
}

async function probePolicies(client: SupabaseClient): Promise<string[]> {
  const ids = [CIELO_VERIFIED_GUEST_POLICY_ID, CIELO_VERIFIED_GUEST_SOLANA_POLICY_ID];
  const { data } = await client.from("partner_policies").select("id").in("id", ids);
  return (data ?? []).map((row: { id: string }) => row.id);
}

export async function probeDemoActivationReadiness(
  env: Record<string, string | undefined> = process.env,
): Promise<DemoActivationReadiness> {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const key = env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  const safety = assertDemoSupabaseNotProduction({ supabaseUrl: url || `https://${DEMO_SUPABASE_PROJECT_REF}.supabase.co` });

  const blocked_reasons: string[] = [];
  const founder_actions: string[] = [];

  if (safety.isProductionRef) {
    blocked_reasons.push("production_supabase_binding");
    founder_actions.push("Point Demo Vercel env at ocntwbxarpjeixdnzide only.");
  }

  const solana_native_enabled = isSolanaNativeProductEnabled(env);
  let tablesPresent: string[] = [];
  let policyIds: string[] = [];

  if (url && key && safety.verdict === "pass") {
    const client = createClient(url, key, { auth: { persistSession: false } });
    tablesPresent = await probeTables(client);
    policyIds = await probePolicies(client);
  } else {
    blocked_reasons.push("demo_supabase_credentials_unavailable");
    founder_actions.push("Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY for Demo probe (local or Vercel Demo env).");
  }

  const { checks, ready: migration_table_ready } = evaluateMigrationTableChecks(tablesPresent);
  const gate = evaluateDemoSolanaSchemaGate({
    tablesPresent,
    columnsPresent: tablesPresent.includes("identity_verifications") ? ["identity_verifications.holder_account_id"] : [],
    policyIdsPresent: policyIds,
    latestMigrationName: "087_stocklana_pilot",
  });

  if (!migration_table_ready) {
    blocked_reasons.push("demo_schema_134_138_incomplete");
    for (const action of gate.safeNextActions.slice(0, 3)) {
      founder_actions.push(action);
    }
  }

  const legacy_cielo_policy_present = policyIds.includes(CIELO_VERIFIED_GUEST_POLICY_ID);
  const solana_cielo_policy_present = policyIds.includes(CIELO_VERIFIED_GUEST_SOLANA_POLICY_ID);

  if (solana_native_enabled && !solana_cielo_policy_present) {
    blocked_reasons.push("missing_cielo_verified_guest_solana_policy");
  }

  const phantom_cielo_path_ready = solana_native_enabled
    && migration_table_ready
    && solana_cielo_policy_present
    && safety.verdict === "pass";

  if (solana_native_enabled && !phantom_cielo_path_ready && migration_table_ready === false) {
    founder_actions.push(
      "After authorized apply of 134→138 on Demo, enable ABRAXAS_SOLANA_NATIVE on Demo Vercel env and redeploy.",
    );
  }

  if (!isPublicDemoRuntime(env) && env.VERCEL_ENV === "production") {
    blocked_reasons.push("runtime_not_demo");
  }

  return {
    demo_origin: PUBLIC_DEMO_ORIGIN,
    runtime_env: env.ABRAXAS_RUNTIME_ENV?.trim() ?? null,
    solana_native_enabled,
    deployment_sha: env.VERCEL_GIT_COMMIT_SHA?.trim() ?? null,
    supabase_project_ref: url.includes(DEMO_SUPABASE_PROJECT_REF) ? DEMO_SUPABASE_PROJECT_REF : null,
    supabase_binding_ok: safety.verdict === "pass" && url.includes(DEMO_SUPABASE_PROJECT_REF),
    migration_table_ready,
    migration_checks: checks,
    solana_schema_verdict: gate.verdict,
    solana_schema_complete: gate.solanaSchemaComplete,
    ready_for_incremental_apply: gate.readyForIncrementalApply,
    legacy_cielo_policy_present,
    solana_cielo_policy_present,
    phantom_cielo_path_ready,
    blocked_reasons: Array.from(new Set(blocked_reasons)),
    founder_actions: Array.from(new Set(founder_actions)),
  };
}
