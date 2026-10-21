#!/usr/bin/env npx tsx
/** Create one hosted handoff for an existing app; API key via BUILD773_SANDBOX_API_KEY env only. */
import { writeFileSync } from "node:fs";
import { LaunchpadStagingClient } from "../launchpad-staging-smoke/client";
import { parseStagingTargetFromEnv } from "../launchpad-staging-smoke/guards";

const APPLICATION_ID = "a8497880-2228-49fe-9aa3-742567f6eaca";
const PUBLIC_SLUG = "accept-wc-1792569551119";

async function main() {
  const apiKey = process.env.BUILD773_SANDBOX_API_KEY?.trim();
  if (!apiKey?.startsWith("abx_test_")) {
    console.error("BUILD773_SANDBOX_API_KEY required (abx_test_…)");
    process.exit(1);
  }
  const stagingUrl = process.env.LAUNCHPAD_STAGING_URL?.replace(/\/$/, "") ?? "";
  const config = { ...parseStagingTargetFromEnv(), targetUrl: stagingUrl };
  const client = new LaunchpadStagingClient(config);
  const returnUrl = `${config.targetUrl}/partner/callback`;

  const identity = await client.getJson("/api/launchpad/staging/environment");
  const verifyConfig = await client.getJson(
    `/api/launchpad/public/verify-config?app=${encodeURIComponent(PUBLIC_SLUG)}&return_url=${encodeURIComponent(returnUrl)}`,
  );
  const cfg = (verifyConfig.body as { config?: Record<string, unknown> }).config ?? {};

  const authHeader = {
    authorization: `Bearer ${apiKey}`,
    "x-abraxas-application-id": APPLICATION_ID,
  };
  const handoff = await client.postJson("/api/v1/partner-handoff", { runtime: "nextjs" }, authHeader);
  const body = handoff.body as Record<string, unknown>;

  const out = {
    timestamp: new Date().toISOString(),
    staging_url: config.targetUrl,
    identity: identity.body,
    application_id: APPLICATION_ID,
    public_slug: PUBLIC_SLUG,
    handoff_status: handoff.status,
    verify_request: body.verify_request,
    hosted_url: body.hosted_url,
    expires_at: body.expires_at,
    policy_id: cfg.policy_id ?? body.policy_id,
    disclosed_result: cfg.disclosed_result,
    user_explanation: cfg.user_explanation,
    display_name: cfg.display_name,
    return_url_bound: cfg.return_url,
    pack_id: cfg.pack_id,
  };

  writeFileSync("/opt/cursor/artifacts/build-773-founder-request-1.json", `${JSON.stringify(out, null, 2)}\n`);
  console.log(
    JSON.stringify({
      ok: handoff.status === 200,
      verify_request: body.verify_request,
      expires_at: body.expires_at,
      hosted_url: body.hosted_url,
    }),
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
