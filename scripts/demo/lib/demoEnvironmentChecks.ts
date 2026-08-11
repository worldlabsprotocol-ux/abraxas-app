// FILE: scripts/demo/lib/demoEnvironmentChecks.ts
// Read-only database and configuration checks for Partner Sandbox demo environments.

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEMO_OPTIONAL_TABLES,
  DEMO_REQUIRED_EXTENSIONS,
  DEMO_REQUIRED_POLICY_CLAIMS,
  DEMO_REQUIRED_TABLES,
  DEMO_SANDBOX_ISSUER_ID,
  DEMO_SANDBOX_PARTNER_ID,
  DEMO_SANDBOX_POLICY_ID,
} from "./demoMigrationManifest";
import { maskSubjectId } from "./demoProjectGuard";

export type CheckStatus = "pass" | "fail" | "warn" | "skip" | "unverifiable";

export interface EnvironmentCheckResult {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  evidence?: string;
  optional?: boolean;
}

export interface EnvironmentValidationReport {
  results: EnvironmentCheckResult[];
  exitCode: 0 | 1 | 2;
}

export type ExtensionProbeResult = "available" | "missing" | "unverifiable";

export type ExtensionProbe = (
  client: SupabaseClient,
  extensionName: string,
) => Promise<ExtensionProbeResult>;

interface PolicyRulesJson {
  sandbox_only?: boolean;
  required_claims?: Array<{
    claim_type?: string;
    max_age_hours?: number;
    min_assurance?: string;
    must_equal?: string;
  }>;
}

const CATALOG_INSPECTION_BLOCKER =
  "Supabase REST cannot read pg_catalog / information_schema in Phase A; requires a future read-only RPC or direct Postgres connection.";

export async function probeExtensionAvailability(
  _client: SupabaseClient,
  _extensionName: string,
): Promise<ExtensionProbeResult> {
  return "unverifiable";
}

export async function runEnvironmentChecks(input: {
  client: SupabaseClient;
  demoSubjectId?: string;
  extensionProbe?: ExtensionProbe;
}): Promise<EnvironmentValidationReport> {
  const results: EnvironmentCheckResult[] = [];
  const extensionProbe = input.extensionProbe ?? probeExtensionAvailability;

  results.push(...(await checkRequiredExtensions(input.client, extensionProbe)));
  results.push(...(await checkCatalogInspectionLimits()));

  for (const table of DEMO_REQUIRED_TABLES) {
    results.push(await checkTableExists(input.client, table, false));
  }

  for (const table of DEMO_OPTIONAL_TABLES) {
    results.push(await checkTableExists(input.client, table, true));
  }

  results.push(await checkVerificationDecisionsIdempotency(input.client));
  results.push(await checkSandboxPartner(input.client));
  results.push(await checkSandboxPolicy(input.client));
  results.push(await checkSandboxIssuer(input.client));
  results.push(await checkWebhookDeliveryDisabled(input.client));
  results.push(checkDemoSubjectConfiguration(input.demoSubjectId));

  if (input.demoSubjectId) {
    results.push(await checkDemoSubjectCredential(input.client, input.demoSubjectId));
  }

  const hasUnsafeConfig = results.some((r) => r.id === "demo_subject_config" && r.status === "fail");
  const hasMissingRequired = results.some(
    (r) => !r.optional && (r.status === "fail" || r.status === "unverifiable"),
  );

  const exitCode: 0 | 1 | 2 = hasUnsafeConfig
    ? 2
    : hasMissingRequired
      ? 1
      : 0;

  return { results, exitCode };
}

async function checkRequiredExtensions(
  client: SupabaseClient,
  extensionProbe: ExtensionProbe,
): Promise<EnvironmentCheckResult[]> {
  const results: EnvironmentCheckResult[] = [];

  for (const extension of DEMO_REQUIRED_EXTENSIONS) {
    const probe = await extensionProbe(client, extension.name);

    if (probe === "missing") {
      results.push({
        id: `extension_${extension.name}`,
        label: `Extension ${extension.name}`,
        status: "fail",
        detail: `Required extension ${extension.name} is missing (needed before ${extension.requiredBefore})`,
        evidence: `extensionProbe(${extension.name}) -> missing`,
      });
      continue;
    }

    if (probe === "unverifiable") {
      results.push({
        id: `extension_${extension.name}`,
        label: `Extension ${extension.name}`,
        status: "unverifiable",
        detail: `Cannot verify ${extension.name} via Supabase REST in Phase A`,
        evidence: CATALOG_INSPECTION_BLOCKER,
        optional: true,
      });
      continue;
    }

    results.push({
      id: `extension_${extension.name}`,
      label: `Extension ${extension.name}`,
      status: "pass",
      detail: `${extension.name} available`,
      evidence: `extensionProbe(${extension.name}) -> available`,
    });
  }

  return results;
}

async function checkCatalogInspectionLimits(): Promise<EnvironmentCheckResult[]> {
  return [
    {
      id: "catalog_rls_enabled",
      label: "RLS enabled flags",
      status: "unverifiable",
      detail: "Cannot inspect pg_class.relrowsecurity via Supabase REST",
      evidence: CATALOG_INSPECTION_BLOCKER,
      optional: true,
    },
    {
      id: "catalog_pg_policies",
      label: "pg_policies",
      status: "unverifiable",
      detail: "Cannot inspect pg_policies via Supabase REST",
      evidence: CATALOG_INSPECTION_BLOCKER,
      optional: true,
    },
    {
      id: "catalog_pg_indexes",
      label: "pg_indexes",
      status: "unverifiable",
      detail: "Cannot inspect pg_indexes via Supabase REST",
      evidence: CATALOG_INSPECTION_BLOCKER,
      optional: true,
    },
    {
      id: "catalog_functions",
      label: "Database functions / RPCs",
      status: "unverifiable",
      detail: "Cannot enumerate pg_proc or call catalog RPCs in read-only Phase A",
      evidence: CATALOG_INSPECTION_BLOCKER,
      optional: true,
    },
    {
      id: "catalog_information_schema",
      label: "information_schema columns",
      status: "unverifiable",
      detail: "Cannot query information_schema via Supabase REST",
      evidence: CATALOG_INSPECTION_BLOCKER,
      optional: true,
    },
    {
      id: "legacy_006_permissive_policies",
      label: "Legacy 006 permissive anon policies",
      status: "unverifiable",
      detail: "Policy posture requires pg_policies inspection",
      evidence: CATALOG_INSPECTION_BLOCKER,
      optional: true,
    },
  ];
}

async function checkTableExists(
  client: SupabaseClient,
  table: string,
  optional: boolean,
): Promise<EnvironmentCheckResult> {
  const evidence = `client.from("${table}").select("*", { count: "exact", head: true })`;
  const { count, error } = await client
    .from(table as "partners")
    .select("*", { count: "exact", head: true });

  if (error?.code === "42P01" || error?.message?.toLowerCase().includes("does not exist")) {
    return {
      id: `table_${table}`,
      label: `Table ${table}`,
      status: optional ? "warn" : "fail",
      detail: optional ? "Optional table missing" : "Required table missing",
      evidence,
      optional,
    };
  }

  if (error) {
    return {
      id: `table_${table}`,
      label: `Table ${table}`,
      status: optional ? "warn" : "fail",
      detail: `Query error: ${error.message}`,
      evidence,
      optional,
    };
  }

  return {
    id: `table_${table}`,
    label: `Table ${table}`,
    status: "pass",
    detail: `Present (row estimate: ${count ?? "unknown"})`,
    evidence,
    optional,
  };
}

async function checkVerificationDecisionsIdempotency(client: SupabaseClient): Promise<EnvironmentCheckResult> {
  const evidence = `client.from("verification_decisions").select("idempotency_key").limit(1)`;
  const { error } = await client
    .from("verification_decisions")
    .select("idempotency_key")
    .limit(1);

  if (error?.message?.includes("idempotency_key")) {
    return {
      id: "idempotency_column",
      label: "verification_decisions.idempotency_key",
      status: "fail",
      detail: "Column missing — apply 053_partner_flow_idempotency.sql",
      evidence,
    };
  }

  if (error?.code === "42P01") {
    return {
      id: "idempotency_column",
      label: "verification_decisions.idempotency_key",
      status: "fail",
      detail: "verification_decisions table missing",
      evidence,
    };
  }

  if (error) {
    return {
      id: "idempotency_column",
      label: "verification_decisions.idempotency_key",
      status: "fail",
      detail: error.message,
      evidence,
    };
  }

  return {
    id: "idempotency_column",
    label: "verification_decisions.idempotency_key",
    status: "pass",
    detail: "Column present",
    evidence,
  };
}

async function checkSandboxPartner(client: SupabaseClient): Promise<EnvironmentCheckResult> {
  const evidence = `client.from("partners").select("partner_id, status").eq("partner_id", "${DEMO_SANDBOX_PARTNER_ID}").maybeSingle()`;
  const { data, error } = await client
    .from("partners")
    .select("partner_id, status")
    .eq("partner_id", DEMO_SANDBOX_PARTNER_ID)
    .maybeSingle();

  if (error || !data) {
    return {
      id: "sandbox_partner",
      label: "Sandbox partner row",
      status: "fail",
      detail: error?.message ?? `Missing partner ${DEMO_SANDBOX_PARTNER_ID}`,
      evidence,
    };
  }

  if (data.status !== "sandbox") {
    return {
      id: "sandbox_partner",
      label: "Sandbox partner row",
      status: "fail",
      detail: `Expected status=sandbox, got ${String(data.status)}`,
      evidence,
    };
  }

  return {
    id: "sandbox_partner",
    label: "Sandbox partner row",
    status: "pass",
    detail: `${DEMO_SANDBOX_PARTNER_ID} status=sandbox`,
    evidence,
  };
}

async function checkSandboxPolicy(client: SupabaseClient): Promise<EnvironmentCheckResult> {
  const evidence = `client.from("partner_policies").select("id, partner_id, status, rules_json").eq("id", "${DEMO_SANDBOX_POLICY_ID}").eq("status", "active").maybeSingle()`;
  const { data, error } = await client
    .from("partner_policies")
    .select("id, partner_id, status, rules_json")
    .eq("id", DEMO_SANDBOX_POLICY_ID)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) {
    return {
      id: "sandbox_policy",
      label: "Sandbox policy row",
      status: "fail",
      detail: error?.message ?? `Missing active policy ${DEMO_SANDBOX_POLICY_ID}`,
      evidence,
    };
  }

  if (data.partner_id !== DEMO_SANDBOX_PARTNER_ID) {
    return {
      id: "sandbox_policy",
      label: "Sandbox policy row",
      status: "fail",
      detail: `Policy partner_id mismatch: ${String(data.partner_id)}`,
      evidence,
    };
  }

  const rules = data.rules_json as PolicyRulesJson;
  if (rules.sandbox_only !== true) {
    return {
      id: "sandbox_policy",
      label: "Sandbox policy row",
      status: "fail",
      detail: "rules_json.sandbox_only must be true",
      evidence,
    };
  }

  const claimTypes = new Set(
    (rules.required_claims ?? []).map((c) => c.claim_type).filter(Boolean) as string[],
  );
  const missingClaims = DEMO_REQUIRED_POLICY_CLAIMS.filter((c) => !claimTypes.has(c));
  if (missingClaims.length > 0) {
    return {
      id: "sandbox_policy_claims",
      label: "Sandbox policy required claims",
      status: "fail",
      detail: `Missing required claims: ${missingClaims.join(", ")}`,
      evidence,
    };
  }

  return {
    id: "sandbox_policy",
    label: "Sandbox policy row",
    status: "pass",
    detail: `${DEMO_SANDBOX_POLICY_ID} sandbox_only=true with required claims`,
    evidence,
  };
}

async function checkSandboxIssuer(client: SupabaseClient): Promise<EnvironmentCheckResult> {
  const evidence = `client.from("credential_issuers").select("id, issuer_status").eq("id", "${DEMO_SANDBOX_ISSUER_ID}").maybeSingle()`;
  const { data, error } = await client
    .from("credential_issuers")
    .select("id, issuer_status")
    .eq("id", DEMO_SANDBOX_ISSUER_ID)
    .maybeSingle();

  if (error || !data) {
    return {
      id: "sandbox_issuer",
      label: "Sandbox issuer row",
      status: "fail",
      detail: error?.message ?? `Missing issuer ${DEMO_SANDBOX_ISSUER_ID}`,
      evidence,
    };
  }

  if (data.issuer_status !== "active") {
    return {
      id: "sandbox_issuer",
      label: "Sandbox issuer row",
      status: "fail",
      detail: `Expected issuer_status=active, got ${String(data.issuer_status)}`,
      evidence,
    };
  }

  return {
    id: "sandbox_issuer",
    label: "Sandbox issuer row",
    status: "pass",
    detail: `${DEMO_SANDBOX_ISSUER_ID} active`,
    evidence,
  };
}

async function checkWebhookDeliveryDisabled(client: SupabaseClient): Promise<EnvironmentCheckResult> {
  const evidence = `client.from("partner_webhook_configs").select("partner_id, enabled").eq("partner_id", "${DEMO_SANDBOX_PARTNER_ID}").maybeSingle()`;
  const { data, error } = await client
    .from("partner_webhook_configs")
    .select("partner_id, enabled")
    .eq("partner_id", DEMO_SANDBOX_PARTNER_ID)
    .maybeSingle();

  if (error?.code === "42P01") {
    return {
      id: "webhook_delivery",
      label: "Webhook delivery posture",
      status: "warn",
      detail: "partner_webhook_configs missing (apply 062)",
      evidence,
      optional: true,
    };
  }

  if (error) {
    return {
      id: "webhook_delivery",
      label: "Webhook delivery posture",
      status: "warn",
      detail: error.message,
      evidence,
      optional: true,
    };
  }

  if (!data) {
    return {
      id: "webhook_delivery",
      label: "Webhook delivery posture",
      status: "pass",
      detail: "No webhook config row — delivery disabled",
      evidence,
      optional: true,
    };
  }

  if (data.enabled === true) {
    return {
      id: "webhook_delivery",
      label: "Webhook delivery posture",
      status: "warn",
      detail: `Delivery enabled for ${DEMO_SANDBOX_PARTNER_ID} — disable for Phase 1 presenter flow`,
      evidence,
      optional: true,
    };
  }

  return {
    id: "webhook_delivery",
    label: "Webhook delivery posture",
    status: "pass",
    detail: "Webhook config present with delivery disabled",
    evidence,
    optional: true,
  };
}

function checkDemoSubjectConfiguration(demoSubjectId?: string): EnvironmentCheckResult {
  const evidence = "process.env.PARTNER_SANDBOX_DEMO_SUBJECT_ID shape validation (no database query)";
  const raw = demoSubjectId?.trim();
  if (!raw) {
    return {
      id: "demo_subject_config",
      label: "PARTNER_SANDBOX_DEMO_SUBJECT_ID",
      status: "warn",
      detail: "Not configured — required before presenter rehearsal (Phase B provisioner)",
      evidence,
      optional: true,
    };
  }

  if (!/^0x[a-fA-F0-9]{64}$/.test(raw)) {
    return {
      id: "demo_subject_config",
      label: "PARTNER_SANDBOX_DEMO_SUBJECT_ID",
      status: "fail",
      detail: "Configured value is not a normalized 32-byte Sui address",
      evidence,
    };
  }

  return {
    id: "demo_subject_config",
    label: "PARTNER_SANDBOX_DEMO_SUBJECT_ID",
    status: "pass",
    detail: `Configured (${maskSubjectId(raw)})`,
    evidence,
  };
}

async function checkDemoSubjectCredential(
  client: SupabaseClient,
  subjectId: string,
): Promise<EnvironmentCheckResult> {
  const evidence = `client.from("identity_verifications").select("status, credential_jti").or("sui_address.eq.${maskSubjectId(subjectId)}").maybeSingle()`;
  const { data, error } = await client
    .from("identity_verifications")
    .select("status, credential_jti")
    .or(`sui_address.eq.${subjectId},wallet_address.eq.${subjectId}`)
    .maybeSingle();

  if (error) {
    return {
      id: "demo_subject_credential",
      label: "Demo subject credential",
      status: "warn",
      detail: error.message,
      evidence,
      optional: true,
    };
  }

  if (!data || data.status !== "approved" || !data.credential_jti) {
    return {
      id: "demo_subject_credential",
      label: "Demo subject credential",
      status: "warn",
      detail: "No active approved credential for configured subject (Phase B provisioner)",
      evidence,
      optional: true,
    };
  }

  return {
    id: "demo_subject_credential",
    label: "Demo subject credential",
    status: "pass",
    detail: `Active credential present for ${maskSubjectId(subjectId)}`,
    evidence,
    optional: true,
  };
}

export function formatValidationReport(report: EnvironmentValidationReport): string {
  const lines = ["Partner Sandbox Environment Validation", "======================================"];
  for (const result of report.results) {
    const tag = result.status.toUpperCase();
    const optional = result.optional ? " (optional)" : "";
    lines.push(`[${tag}] ${result.label}${optional}: ${result.detail}`);
    if (result.evidence) {
      lines.push(`       evidence: ${result.evidence}`);
    }
  }
  lines.push("");
  lines.push(
    report.exitCode === 0
      ? "Result: READY"
      : report.exitCode === 1
        ? "Result: MISSING OR INCORRECT DATABASE REQUIREMENTS"
        : "Result: UNSAFE OR INVALID CONFIGURATION",
  );
  return lines.join("\n");
}
