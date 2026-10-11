// Executable sandbox activation preflight — distinguishes config from live behavior.

import { loadReceiptSigningKey, loadReceiptVerificationKey } from "@/lib/decisionReceipts/signing";
import { evaluateInstitutionalEnvironmentReadiness } from "@/lib/institutional/integration/institutionalEnvironmentReadiness";
import { INSTITUTIONAL_INTEGRATION_CONTRACT_VERSION } from "@/lib/institutional/integration/institutionalIntegrationContract";
import { probeMigration140InsertRevoked } from "@/lib/institutional/replayMigration140Probe";
import { probeInstitutionalReplayReadiness } from "@/lib/institutional/replayReadinessProbe";
import {
  evaluateSandboxSupabaseTarget,
  resolveInstitutionalSandboxEnvironmentId,
  sandboxDatabaseUrlForPrivilegeProbe,
} from "@/lib/institutional/sandbox/sandboxProjectAllowlist";
import { verifyWebhookSignature } from "@/lib/partner/webhooks/webhookSigning";

export type SandboxPreflightVerdict = "PASS" | "FAIL" | "BLOCKED";

export type SandboxPreflightCheck = {
  id: string;
  label: string;
  verdict: SandboxPreflightVerdict;
  detail: string;
  evidence_ref: string;
};

export type SandboxActivationPreflightReport = {
  schema: "institutional_sandbox_activation_preflight_v1";
  environment_id: string | null;
  supabase_project_ref: string | null;
  contract_version: typeof INSTITUTIONAL_INTEGRATION_CONTRACT_VERSION;
  overall: SandboxPreflightVerdict;
  checks: SandboxPreflightCheck[];
  commit_sha_hint: string | null;
  base_url: string | null;
};

function chk(
  id: string,
  label: string,
  verdict: SandboxPreflightVerdict,
  detail: string,
  evidence_ref: string,
): SandboxPreflightCheck {
  return { id, label, verdict, detail, evidence_ref };
}

async function probeMigrationRows(databaseUrl: string): Promise<{ applied_139: boolean; applied_140: boolean; detail: string }> {
  try {
    const pg = await import("pg");
    const pool = new pg.Pool({ connectionString: databaseUrl });
    try {
      const fn = await pool.query(
        `SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
         WHERE n.nspname = 'public' AND p.proname = 'institutional_eligibility_consume_nonce' LIMIT 1`,
      );
      await pool.query(`DO $$ BEGIN CREATE ROLE service_role NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`).catch(() => undefined);
      const revoked = await pool.query(
        "SELECT has_table_privilege('service_role', 'public.institutional_eligibility_consume_nonces', 'INSERT') AS allowed",
      );
      const insertAllowed = revoked.rows[0]?.allowed === true;
      return {
        applied_139: (fn.rowCount ?? 0) > 0,
        applied_140: !insertAllowed,
        detail: `fn=${(fn.rowCount ?? 0) > 0} service_role_insert=${insertAllowed}`,
      };
    } finally {
      await pool.end();
    }
  } catch (e) {
    return { applied_139: false, applied_140: false, detail: `db_probe_error:${String(e)}` };
  }
}

function buildPreflightFetchHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const bypass = process.env.VERCEL_PROTECTION_BYPASS?.trim();
  if (bypass) headers["x-vercel-protection-bypass"] = bypass;
  return headers;
}

async function probePublicConsumeReachability(
  baseUrl: string,
  fetchFn: typeof fetch = fetch,
): Promise<{ reachable: boolean; status: number; detail: string }> {
  const url = `${baseUrl.replace(/\/$/, "")}/api/v1/institutional/eligibility/consume`;
  try {
    const res = await fetchFn(url, {
      method: "POST",
      headers: buildPreflightFetchHeaders(),
      body: "{}",
      signal: AbortSignal.timeout(15_000),
    });
    const bodyText = (await res.text()).slice(0, 256);
    const contentType = res.headers.get("content-type") ?? "";
    const jsonApi = contentType.includes("application/json") || bodyText.trimStart().startsWith("{");
    const apiStatus = [400, 401, 403, 429, 503].includes(res.status);
    const reachable = jsonApi && apiStatus;
    let detail = `http_${res.status} content_type=${contentType.split(";")[0] || "unknown"}`;
    if (!jsonApi && res.status === 401) {
      detail = "deployment_protection_or_html_401_not_institutional_api";
    } else if (!jsonApi) {
      detail = `non_json_response http_${res.status}`;
    } else if (reachable) {
      detail = `http_${res.status}_institutional_api_json`;
    }
    return { reachable, status: res.status, detail };
  } catch (e) {
    return { reachable: false, status: 0, detail: `fetch_failed:${String(e)}` };
  }
}

export async function runSandboxActivationPreflight(input?: {
  baseUrl?: string;
  fetchFn?: typeof fetch;
}): Promise<SandboxActivationPreflightReport> {
  const checks: SandboxPreflightCheck[] = [];
  const baseUrl = input?.baseUrl?.trim() || process.env.INSTITUTIONAL_SANDBOX_BASE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim() || null;
  const commit_sha_hint = process.env.VERCEL_GIT_COMMIT_SHA?.trim() || process.env.GIT_COMMIT?.trim() || null;

  const target = evaluateSandboxSupabaseTarget();
  checks.push(chk(
    "explicit_sandbox_identity",
    "Explicit non-production sandbox environment identifier",
    target.verdict,
    target.detail,
    "INSTITUTIONAL_SANDBOX_ENVIRONMENT_ID + allowlist",
  ));

  const replay = await probeInstitutionalReplayReadiness();
  checks.push(chk(
    "live_replay_rpc",
    "Live Supabase replay RPC responds (non-mutating probe)",
    replay.probe_result === "rpc_responded" ? "PASS" : replay.probe_result === "schema_missing" ? "FAIL" : "BLOCKED",
    replay.detail,
    "lib/institutional/replayReadinessProbe.ts",
  ));

  const dbUrl = sandboxDatabaseUrlForPrivilegeProbe();
  let migration140Revoked = await probeMigration140InsertRevoked();
  if (dbUrl && migration140Revoked == null) {
    process.env.INSTITUTIONAL_REPLAY_TEST_DATABASE_URL = dbUrl;
    migration140Revoked = await probeMigration140InsertRevoked();
  }
  checks.push(chk(
    "migration_140_insert_revoked",
    "Direct INSERT on consume_nonces revoked for service_role",
    migration140Revoked === true ? "PASS" : migration140Revoked === false ? "FAIL" : "BLOCKED",
    migration140Revoked == null ? "Set INSTITUTIONAL_SANDBOX_DATABASE_URL for privilege probe" : String(migration140Revoked),
    "supabase/migrations/140_institutional_replay_rpc_hardening.sql",
  ));

  if (dbUrl) {
    const mig = await probeMigrationRows(dbUrl);
    checks.push(chk(
      "database_migration_identity",
      "Database migration 139/140 objects on connected sandbox DB",
      mig.applied_139 && mig.applied_140 ? "PASS" : mig.applied_139 ? "FAIL" : "FAIL",
      mig.detail,
      "139_institutional_eligibility_consume_nonces.sql",
    ));
  } else {
    checks.push(chk(
      "database_migration_identity",
      "Database migration 139/140 objects on connected sandbox DB",
      "BLOCKED",
      "INSTITUTIONAL_SANDBOX_DATABASE_URL not set — cannot verify migration objects independently of RPC",
      "operator: disposable rehearsal or sandbox DB URL",
    ));
  }

  const signingKey = loadReceiptSigningKey();
  const verifyKey = loadReceiptVerificationKey();
  checks.push(chk(
    "receipt_signing_live",
    "Receipt signing key loads and verification key available",
    signingKey && verifyKey?.x ? "PASS" : "BLOCKED",
    signingKey ? "signing_key_loaded" : "ABRAXAS_SIGNING_KEY missing",
    "lib/decisionReceipts/signing.ts",
  ));

  const webhookProbe = verifyWebhookSignature({
    rawBody: '{"event":"sandbox_preflight"}',
    signatureHeader: "invalid",
    secret: "sandbox-preflight-probe-secret",
    timestamp: String(Math.floor(Date.now() / 1000)),
  });
  checks.push(chk(
    "webhook_hmac_runtime",
    "Webhook HMAC verification runtime available",
    webhookProbe.ok === false ? "PASS" : "FAIL",
    "invalid_signature_rejected",
    "lib/partner/webhooks/webhookSigning.ts",
  ));

  const readiness = await evaluateInstitutionalEnvironmentReadiness();
  checks.push(chk(
    "institutional_readiness_gate",
    "Institutional environment readiness aggregate",
    readiness.overall,
    `sandbox_pilot_technically_ready=${readiness.sandbox_pilot_technically_ready}`,
    "lib/institutional/integration/institutionalEnvironmentReadiness.ts",
  ));

  checks.push(chk(
    "audit_telemetry_path",
    "Audit telemetry via Supabase service role",
    replay.configured ? "PASS" : "BLOCKED",
    replay.configured ? "service_role_configured" : "supabase_admin_unconfigured",
    "lib/institutional/securityTelemetry.ts",
  ));

  const fetchFn = input?.fetchFn ?? fetch;
  if (baseUrl) {
    const reach = await probePublicConsumeReachability(baseUrl, fetchFn);
    checks.push(chk(
      "public_consume_endpoint",
      "Public institutional consume endpoint reachable",
      reach.reachable ? "PASS" : "FAIL",
      `${reach.detail} url=${baseUrl}`,
      "POST /api/v1/institutional/eligibility/consume",
    ));
  } else {
    checks.push(chk(
      "public_consume_endpoint",
      "Public institutional consume endpoint reachable",
      "BLOCKED",
      "Set INSTITUTIONAL_SANDBOX_BASE_URL or NEXT_PUBLIC_APP_URL",
      "POST /api/v1/institutional/eligibility/consume",
    ));
  }

  const hasFail = checks.some(c => c.verdict === "FAIL");
  const allPass = checks.every(c => c.verdict === "PASS");
  const overall: SandboxPreflightVerdict = hasFail ? "FAIL" : allPass ? "PASS" : "BLOCKED";

  return {
    schema: "institutional_sandbox_activation_preflight_v1",
    environment_id: resolveInstitutionalSandboxEnvironmentId(),
    supabase_project_ref: target.observed_project_ref,
    contract_version: INSTITUTIONAL_INTEGRATION_CONTRACT_VERSION,
    overall,
    checks,
    commit_sha_hint,
    base_url: baseUrl,
  };
}
