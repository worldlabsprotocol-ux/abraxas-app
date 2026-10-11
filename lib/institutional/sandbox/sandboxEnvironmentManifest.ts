// Operator manifest — names only, never secret values.

import { loadReceiptSigningKey } from "@/lib/decisionReceipts/signing";
import { evaluateSandboxSupabaseTarget } from "@/lib/institutional/sandbox/sandboxProjectAllowlist";
import { shouldEnforceDemoRuntimeBoot, isPublicDemoRuntime } from "@/lib/product/demoRuntime";
import { supabaseProjectRefFromUrl } from "@/lib/supabase/projectRefs";

export type EnvVarPresence = "configured" | "missing" | "misconfigured";

export type SandboxEnvironmentManifest = {
  schema: "institutional_sandbox_environment_manifest_v528";
  generated_at: string;
  dedicated_supabase: {
    required: boolean;
    observed_project_ref: string | null;
    is_production_ref: boolean;
    allowlist_verdict: string;
  };
  dedicated_vercel: {
    guidance: string;
    vercel_env: string | null;
    demo_runtime_flag: boolean;
    demo_boot_enforced: boolean;
    preview_demo_leak_risk: boolean;
  };
  variables: Array<{
    name: string;
    presence: EnvVarPresence;
    purpose: string;
  }>;
  migration_requirements: string[];
  backup_requirements: string[];
  credential_requirements: string[];
  live_test_requirements: string[];
  operator_minimal_actions: string[];
};

const INSTITUTIONAL_SANDBOX_ENV_NAMES = [
  { name: "INSTITUTIONAL_SANDBOX_ENVIRONMENT_ID", purpose: "Explicit non-production sandbox label" },
  { name: "INSTITUTIONAL_SANDBOX_ALLOWED_PROJECT_REFS", purpose: "Comma-separated Supabase project ref allowlist" },
  { name: "INSTITUTIONAL_SANDBOX_BASE_URL", purpose: "HTTPS base URL for live institutional API tests" },
  { name: "NEXT_PUBLIC_SUPABASE_URL", purpose: "Supabase project URL for institutional data plane" },
  { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", purpose: "Supabase anon key (public)" },
  { name: "SUPABASE_SERVICE_ROLE_KEY", purpose: "Server-side Supabase admin (never expose to client)" },
  { name: "ABRAXAS_SIGNING_KEY", purpose: "Ed25519 receipt signing JWK (server only)" },
  { name: "ABRAXAS_PUBLIC_KEY", purpose: "Optional receipt verification JWK" },
  { name: "NEXTAUTH_SECRET", purpose: "Replay nonce HMAC derivation" },
  { name: "PARTNER_FLOW_RATE_LIMIT_SALT", purpose: "Rate limit HMAC (or ABRAXAS_SIGNING_KEY fallback)" },
] as const;

function presence(name: string): EnvVarPresence {
  const v = process.env[name]?.trim();
  if (!v) return "missing";
  if (name === "ABRAXAS_RUNTIME_ENV" && v === "demo" && process.env.VERCEL_ENV === "preview") {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    if (!appUrl.includes("demo.abraxasworld.xyz")) return "misconfigured";
  }
  return "configured";
}

export function buildSandboxEnvironmentManifest(): SandboxEnvironmentManifest {
  const target = evaluateSandboxSupabaseTarget();
  const demoFlag = isPublicDemoRuntime();
  const demoBoot = shouldEnforceDemoRuntimeBoot();
  const previewDemoLeak = demoFlag && process.env.VERCEL_ENV === "preview" && demoBoot;

  const variables: SandboxEnvironmentManifest["variables"] = INSTITUTIONAL_SANDBOX_ENV_NAMES.map(v => ({
    name: v.name,
    presence: presence(v.name),
    purpose: v.purpose,
  }));

  if (demoFlag) {
    variables.push({
      name: "ABRAXAS_RUNTIME_ENV",
      presence: previewDemoLeak ? "misconfigured" : presence("ABRAXAS_RUNTIME_ENV"),
      purpose: "Must not force DEMO boot on institutional branch previews",
    });
  }

  const signing = loadReceiptSigningKey();

  return {
    schema: "institutional_sandbox_environment_manifest_v528",
    generated_at: new Date().toISOString(),
    dedicated_supabase: {
      required: true,
      observed_project_ref: supabaseProjectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""),
      is_production_ref: target.is_production_ref,
      allowlist_verdict: target.verdict,
    },
    dedicated_vercel: {
      guidance: "Use a dedicated Preview env or Custom Environment — not production, not public DEMO unless explicitly authorized.",
      vercel_env: process.env.VERCEL_ENV?.trim() ?? null,
      demo_runtime_flag: demoFlag,
      demo_boot_enforced: demoBoot,
      preview_demo_leak_risk: previewDemoLeak,
    },
    variables,
    migration_requirements: [
      "139_institutional_eligibility_consume_nonces.sql",
      "140_institutional_replay_rpc_hardening.sql",
    ],
    backup_requirements: [
      "Supabase PITR or backup before remote migration apply",
      "INSTITUTIONAL_SANDBOX_BACKUP_ACK=acknowledged",
    ],
    credential_requirements: [
      "Scoped abx_test_* partner key with verify:requests",
      "Sandbox launchpad application binding",
      "Webhook signing secret (HTTPS callback URLs)",
    ],
    live_test_requirements: [
      "INSTITUTIONAL_SANDBOX_LIVE_TEST_AUTHORIZED=true",
      "INSTITUTIONAL_SANDBOX_API_KEY",
      "INSTITUTIONAL_SANDBOX_PARTNER_ID",
      "INSTITUTIONAL_SANDBOX_TEST_RECEIPT_ID",
      "INSTITUTIONAL_SANDBOX_TEST_POLICY_ID",
    ],
    operator_minimal_actions: [
      "Provision dedicated non-production Supabase + bind to institutional Vercel environment",
      "Unset or scope ABRAXAS_RUNTIME_ENV=demo away from branch previews",
      "Apply migrations 139/140 via gated tooling after backup ack",
      "Issue sandbox credentials and receipt fixture; run live runner",
      ...(signing ? [] : ["Configure ABRAXAS_SIGNING_KEY on target Vercel environment"]),
    ],
  };
}
