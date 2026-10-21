#!/usr/bin/env npx tsx
/** API-level repeatability: two distinct verify requests, same sandbox application. No secrets in output file. */
import { writeFileSync } from "node:fs";
import { LaunchpadStagingClient } from "../launchpad-staging-smoke/client";
import { parseStagingTargetFromEnv } from "../launchpad-staging-smoke/guards";

async function main() {
  const stagingUrl = process.env.LAUNCHPAD_STAGING_URL?.replace(/\/$/, "") ?? "";
  const config = { ...parseStagingTargetFromEnv(), targetUrl: stagingUrl };
  const client = new LaunchpadStagingClient(config);
  const testTag = `b773-repeat-${Date.now()}`;
  const returnUrl = `${config.targetUrl}/partner/callback`;
  const provision = await client.postJson("/api/developers/integration-studio", {
    application_name: testTag,
    display_name: `Build 773 ${testTag}`,
    policy_template_id: "wallet_control",
    return_url: returnUrl,
    sandbox_id: crypto.randomUUID().replace(/-/g, ""),
    idempotency_key: testTag,
  });
  const body = provision.body as Record<string, unknown>;
  const apiKey = body.api_key as string;
  const app = body.application as Record<string, unknown>;
  const authHeader = {
    authorization: `Bearer ${apiKey}`,
    "x-abraxas-application-id": String(app.application_id),
  };
  const h1 = await client.postJson("/api/v1/partner-handoff", { runtime: "nextjs" }, authHeader);
  const h2 = await client.postJson("/api/v1/partner-handoff", { runtime: "nextjs" }, authHeader);
  const b1 = h1.body as Record<string, unknown>;
  const b2 = h2.body as Record<string, unknown>;
  const out = {
    timestamp: new Date().toISOString(),
    staging_url: config.targetUrl,
    application_id: app.application_id,
    partner_id: app.partner_id,
    policy_id: app.policy_id,
    handoff_a: { verify_request: b1.verify_request, http_status: h1.status },
    handoff_b: { verify_request: b2.verify_request, http_status: h2.status },
    distinct_verify_requests: b1.verify_request !== b2.verify_request,
    hosted_url_a: b1.hosted_url,
    hosted_url_b: b2.hosted_url,
  };
  writeFileSync("/opt/cursor/artifacts/build-773-repeatability-api.json", `${JSON.stringify(out, null, 2)}\n`);
  console.log(JSON.stringify({ ok: h1.status === 200 && h2.status === 200, distinct: out.distinct_verify_requests }));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
