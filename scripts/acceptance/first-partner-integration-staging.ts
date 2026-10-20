#!/usr/bin/env npx tsx
/**
 * First partner integration acceptance (staging preview + abraxas-partner-demo).
 * Never prints full API keys — only prefix and length.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { LaunchpadStagingClient } from "../launchpad-staging-smoke/client";
import { parseStagingTargetFromEnv } from "../launchpad-staging-smoke/guards";
import { describeApiKey } from "../launchpad-staging-smoke/redact";

const PREVIEW =
  process.env.LAUNCHPAD_STAGING_URL?.trim()
  ?? "https://abraxas-app-git-cursor-ve-31daad-worldlabsprotocol-uxs-projects.vercel.app";

const config = {
  ...parseStagingTargetFromEnv(),
  targetUrl: PREVIEW.replace(/\/$/, ""),
};

async function main() {
  const client = new LaunchpadStagingClient(config);
  const testTag = `accept-wc-${Date.now()}`;
  const returnUrl = `${config.targetUrl}/partner/callback`;
  const sandboxId = crypto.randomUUID().replace(/-/g, "");

  const identity = await client.getJson("/api/launchpad/staging/environment");
  const report: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    staging_url: config.targetUrl,
    expected_supabase_ref: config.expectedSupabaseRef,
    identity: identity.body,
    phases: {} as Record<string, unknown>,
  };

  const provision = await client.postJson("/api/developers/integration-studio", {
    application_name: testTag,
    display_name: `Acceptance ${testTag}`,
    policy_template_id: "wallet_control",
    return_url: returnUrl,
    sandbox_id: sandboxId,
    idempotency_key: testTag,
  });

  const provBody = provision.body as Record<string, unknown>;
  const app = provBody.application as Record<string, unknown> | undefined;
  const apiKey = typeof provBody.api_key === "string" ? provBody.api_key : null;

  report.phases.provision = {
    http_status: provision.status,
    ok: provBody.ok,
    code: provBody.code,
    partner_id: app?.partner_id,
    application_id: app?.application_id,
    public_slug: app?.public_slug,
    policy_id: app?.policy_id,
    policy_template_id: app?.policy_template_id,
    key_prefix: app?.key_prefix,
    credential: apiKey ? describeApiKey(apiKey) : null,
    hosted_verify_url: typeof provBody.docs === "object" && provBody.docs
      ? (provBody.docs as { hosted_link?: string }).hosted_link
      : app?.hosted_verify_url,
  };

  if (provision.status !== 200 || !apiKey || !app?.application_id) {
    writeReport(report);
    process.exit(1);
  }

  const appId = String(app.application_id);
  const policyId = String(app.policy_id);
  const partnerId = String(app.partner_id);
  const slug = String(app.public_slug);

  const verifyConfig = await client.getJson(
    `/api/launchpad/public/verify-config?app=${encodeURIComponent(slug)}&return_url=${encodeURIComponent(returnUrl)}`,
  );
  const cfg = verifyConfig.body as Record<string, unknown>;
  const configObj = cfg.config as Record<string, unknown> | undefined;
  report.phases.verify_config = {
    http_status: verifyConfig.status,
    policy_id: configObj?.policy_id,
    disclosed_result: configObj?.disclosed_result,
    pack_id: configObj?.pack_id ?? configObj?.policy_template_id,
  };

  const authHeader = { authorization: `Bearer ${apiKey}`, "x-abraxas-application-id": appId };

  const handoff = await client.postJson("/api/v1/partner-handoff", { runtime: "nextjs" }, authHeader);
  const handoffBody = handoff.body as Record<string, unknown>;
  report.phases.partner_handoff = {
    http_status: handoff.status,
    ok: handoffBody.ok,
    error: handoffBody.error,
    detail: (handoffBody as { detail?: string }).detail,
    verify_request: handoffBody.verify_request,
    hosted_url_present: typeof handoffBody.hosted_url === "string",
    hosted_url_host: typeof handoffBody.hosted_url === "string"
      ? new URL(String(handoffBody.hosted_url)).hostname
      : null,
  };

  const wrongPolicy = await client.postJson(
    "/api/v1/verification-requests",
    { policy_id: `${partnerId}-age_21_retail-v1`, requested_action: "permit" },
    { authorization: `Bearer ${apiKey}` },
  );
  report.phases.failure_mismatch_policy = {
    http_status: wrongPolicy.status,
    error: (wrongPolicy.body as { error?: string })?.error,
  };

  const badCallback = await client.postJson(
    "/api/v1/partner-handoff",
    { return_url: "https://evil.example/callback", runtime: "nextjs" },
    authHeader,
  );
  report.phases.failure_hostile_callback = {
    http_status: badCallback.status,
    error: (badCallback.body as { error?: string })?.error,
  };

  const noAuth = await client.postJson("/api/v1/partner-handoff", { runtime: "nextjs" }, {});
  report.phases.failure_no_auth = { http_status: noAuth.status, error: (noAuth.body as { error?: string })?.error };

  report.phases.holder_browser = {
    status: "requires_founder_wallet",
    hosted_url_for_manual_test:
      typeof handoffBody.hosted_url === "string" ? handoffBody.hosted_url : null,
    note: "Complete Phantom wallet authorization on hosted URL; callback and receipt validation follow in browser.",
  };

  writeReport(report);
  console.log(JSON.stringify({ ok: true, report_path: reportPath(), partner_id: partnerId, slug }, null, 2));
}

function reportPath() {
  return resolve("/opt/cursor/artifacts/first-partner-integration-staging.json");
}

function writeReport(report: Record<string, unknown>) {
  mkdirSync("/opt/cursor/artifacts", { recursive: true });
  writeFileSync(reportPath(), `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
