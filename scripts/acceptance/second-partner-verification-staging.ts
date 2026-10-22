#!/usr/bin/env npx tsx
/**
 * Second independent wallet-control verification (reuse existing Launchpad sandbox app).
 * Requires founder API key — never print full key.
 *
 * Env:
 *   LAUNCHPAD_STAGING_URL, LAUNCHPAD_EXPECTED_SUPABASE_REF, VERCEL_PROTECTION_BYPASS
 *   REUSE_PARTNER_ID — e.g. studio-accept-wc-1792620888278-6a4a2447dfc8
 *   REUSE_APPLICATION_ID — UUID from first provisioning
 *   REUSE_SANDBOX_API_KEY — Bearer key (reveal-once or rotated)
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { LaunchpadStagingClient } from "../launchpad-staging-smoke/client";
import { parseStagingTargetFromEnv } from "../launchpad-staging-smoke/guards";
import { describeApiKey } from "../launchpad-staging-smoke/redact";

const FIRST_VR = "vr_62f996b73bba8bc0";
const FIRST_RECEIPT = "dr_dlZExz0CSUFxQoaj";

/** Non-secret — partner-demo staging record for first successful founder run. */
const DEFAULT_REUSE_APPLICATION_ID = "fbea93d2-6660-428d-85c3-8c4e12d89b05";
const DEFAULT_REUSE_PARTNER_ID = "studio-accept-wc-1792620888278-6a4a2447dfc8";

const config = {
  ...parseStagingTargetFromEnv(),
  targetUrl: (process.env.LAUNCHPAD_STAGING_URL ?? "").replace(/\/$/, ""),
};

async function main() {
  const partnerId = process.env.REUSE_PARTNER_ID?.trim() || DEFAULT_REUSE_PARTNER_ID;
  const applicationId = process.env.REUSE_APPLICATION_ID?.trim() || DEFAULT_REUSE_APPLICATION_ID;
  const apiKey = process.env.REUSE_SANDBOX_API_KEY?.trim();

  if (!apiKey) {
    console.error(
      "Set REUSE_SANDBOX_API_KEY in the Cloud Agent environment (Integration Studio rotate — do not paste in chat).",
    );
    process.exit(1);
  }

  const client = new LaunchpadStagingClient(config);
  const returnUrl = `${config.targetUrl}/partner/callback`;
  const authHeader = {
    authorization: `Bearer ${apiKey}`,
    "x-abraxas-application-id": applicationId,
  };

  const identity = await client.getJson("/api/launchpad/staging/environment");
  const handoff = await client.postJson("/api/v1/partner-handoff", { runtime: "nextjs" }, authHeader);
  const body = handoff.body as Record<string, unknown>;

  const report = {
    timestamp: new Date().toISOString(),
    staging_url: config.targetUrl,
    expected_supabase_ref: config.expectedSupabaseRef,
    git_note: "Run against origin/main including merged #778",
    reuse: {
      partner_id: partnerId,
      application_id: applicationId,
      key: describeApiKey(apiKey),
      return_url: returnUrl,
    },
    first_run_reference: { verify_request: FIRST_VR, receipt_id: FIRST_RECEIPT },
    handoff: {
      http_status: handoff.status,
      verify_request: body.verify_request,
      hosted_url: body.hosted_url,
      expires_at: body.expires_at ?? body.handoff_expires_at,
    },
    founder_action: "Open hosted_url in Phantom; complete wallet control, consent, and callback.",
  };

  const path = resolve("/opt/cursor/artifacts/second-partner-verification-handoff.json");
  mkdirSync("/opt/cursor/artifacts", { recursive: true });
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  if (handoff.status !== 200 || typeof body.hosted_url !== "string") {
    console.error(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify({
    ok: true,
    report_path: path,
    verify_request: body.verify_request,
    hosted_url: body.hosted_url,
    expires_at: report.handoff.expires_at,
    must_differ_from: FIRST_VR,
  }, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
