#!/usr/bin/env npx tsx
// FILE: scripts/build-584/run-authenticated-browser-acceptance.ts

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import {
  INSTITUTIONAL_SANDBOX_LAUNCHPAD_HREF,
  INSTITUTIONAL_SANDBOX_POLICY_TEMPLATE_ID,
} from "@/lib/partner/launchpad/institutionalActivationEntry";
import type {
  BrowserApiObservation,
  BrowserStageId,
  BrowserStageRecord,
  Build584BrowserAcceptanceArtifact,
} from "@/lib/partner/build584/browserAcceptanceArtifact";
import { liveReceiptVerificationBlockedReason } from "@/lib/partner/build584/liveIndependentReceiptVerification";

function stage(status: BrowserStageRecord["status"], detail: string): BrowserStageRecord {
  return { status, detail };
}

async function observeSession(
  base: string,
  request: import("playwright").APIRequestContext,
  label: string,
): Promise<{ observation: BrowserApiObservation; body: Record<string, unknown> }> {
  const path = "/api/launchpad/auth/session";
  const res = await request.get(`${base}${path}`);
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return {
    observation: {
      label,
      method: "GET",
      path,
      http_status: res.status(),
      authenticated: body.authenticated === true,
      partner_id: typeof body.partner_id === "string" ? body.partner_id : undefined,
      environment: typeof body.environment === "string" ? body.environment : undefined,
    },
    body,
  };
}

async function main() {
  const base = (process.env.BUILD584_BROWSER_BASE_URL ?? process.env.BUILD584_SANDBOX_BASE_URL ?? "https://abraxasworld.xyz")
    .replace(/\/$/, "");
  const apiKey = process.env.BUILD584_PARTNER_API_KEY?.trim();
  const applicationId = process.env.BUILD584_APPLICATION_ID?.trim();
  const expectedPartnerId = process.env.BUILD584_EXPECTED_PARTNER_ID?.trim();
  const outDir = process.env.BUILD584_BROWSER_ARTIFACT_DIR?.trim() || join(process.cwd(), "artifacts");
  mkdirSync(outDir, { recursive: true });
  mkdirSync(join(outDir, "build584-browser"), { recursive: true });

  const agentGitSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const recordedAt = new Date().toISOString();
  const evidenceSources: string[] = [];
  const routesTested: string[] = [];
  const apiObservations: BrowserApiObservation[] = [];
  const stages: Partial<Record<BrowserStageId, BrowserStageRecord>> = {
    hosted_holder_authorization: stage(
      "blocked",
      liveReceiptVerificationBlockedReason(),
    ),
    independent_receipt_verification: stage(
      "blocked",
      "Live independent receipt verification requires holder-authorized receipt from the authenticated HTTP journey.",
    ),
  };

  if (!apiKey) {
    stages.partner_authentication = stage(
      "blocked",
      "Set BUILD584_PARTNER_API_KEY (sandbox abx_test_…) in the operator environment. Key is never written to this artifact.",
    );
    stages.application_access = stage("blocked", "Requires partner authentication first.");
    stages.institutional_configuration = stage("blocked", "Requires partner authentication first.");
    writeArtifact(outDir, buildArtifact({
      agentGitSha,
      base,
      recordedAt,
      routesTested,
      evidenceSources,
      apiObservations,
      stages,
      partnerAuthConfirmed: false,
    }));
    process.exit(0);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const request = context.request;

  try {
    const launchpadPath = INSTITUTIONAL_SANDBOX_LAUNCHPAD_HREF;
    await page.goto(`${base}${launchpadPath}`, { waitUntil: "networkidle", timeout: 120_000 });
    routesTested.push(launchpadPath);
    const desktopLaunch = join(outDir, "build584-browser/launchpad-desktop.png");
    await page.screenshot({ path: desktopLaunch, fullPage: true });
    evidenceSources.push(desktopLaunch);

    await page.getByLabel("Sandbox API key").fill(apiKey);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForTimeout(2000);

    const sessionAfterSignIn = await observeSession(base, request, "session_after_sign_in");
    apiObservations.push(sessionAfterSignIn.observation);

    const tenantOk =
      sessionAfterSignIn.observation.authenticated === true
      && sessionAfterSignIn.observation.http_status === 200
      && (!expectedPartnerId || sessionAfterSignIn.observation.partner_id === expectedPartnerId);

    stages.partner_authentication = tenantOk
      ? stage(
          "pass",
          expectedPartnerId
            ? `GET /api/launchpad/auth/session authenticated with expected partner_id.`
            : "GET /api/launchpad/auth/session returned authenticated:true after sign-in.",
        )
      : stage(
          sessionAfterSignIn.observation.http_status === 200 ? "fail" : "fail",
          expectedPartnerId
            ? "Session not authenticated or partner_id does not match BUILD584_EXPECTED_PARTNER_ID."
            : "Session not authenticated after sign-in (UI absence of alert is not sufficient).",
        );

    const signedInShot = join(outDir, "build584-browser/launchpad-after-signin-desktop.png");
    await page.screenshot({ path: signedInShot, fullPage: true });
    evidenceSources.push(signedInShot);

    if (tenantOk && applicationId) {
      const appPath = `/api/launchpad/applications/${applicationId}`;
      const appRes = await request.get(`${base}${appPath}`);
      const appBody = (await appRes.json().catch(() => ({}))) as Record<string, unknown>;
      const application = appBody.application as Record<string, unknown> | undefined;
      apiObservations.push({
        label: "application_access",
        method: "GET",
        path: appPath,
        http_status: appRes.status(),
        application_id: applicationId,
        application_access: appRes.ok() && Boolean(application),
        partner_id: typeof application?.partner_id === "string" ? application.partner_id : undefined,
        policy_template_id: typeof application?.policy_template_id === "string" ? application.policy_template_id : undefined,
      });
      const appPartner = typeof application?.partner_id === "string" ? application.partner_id : null;
      const sessionPartner = sessionAfterSignIn.observation.partner_id ?? null;
      const accessOk = appRes.ok() && application && appPartner === sessionPartner;
      stages.application_access = accessOk
        ? stage("pass", "Protected application API returned application for authenticated partner session.")
        : stage("fail", `Application inaccessible or tenant mismatch (HTTP ${appRes.status()}).`);
    } else if (tenantOk) {
      stages.application_access = stage(
        "blocked",
        "Set BUILD584_APPLICATION_ID to confirm protected application access.",
      );
    } else {
      stages.application_access = stage("blocked", "Partner authentication not confirmed.");
    }

    if (tenantOk && applicationId && stages.application_access?.status === "pass") {
      const healthPath = `/api/launchpad/applications/${applicationId}/integration-health`;
      const healthRes = await request.get(`${base}${healthPath}`);
      const healthBody = (await healthRes.json().catch(() => ({}))) as Record<string, unknown>;
      const hasActivation = Boolean(healthBody.institutional_activation);
      apiObservations.push({
        label: "institutional_integration_health",
        method: "GET",
        path: healthPath,
        http_status: healthRes.status(),
        application_id: applicationId,
        institutional_activation_present: hasActivation,
      });
      const lastAppObs = apiObservations.find((o) => o.label === "application_access");
      const policyOk = lastAppObs?.policy_template_id === INSTITUTIONAL_SANDBOX_POLICY_TEMPLATE_ID;
      stages.institutional_configuration = healthRes.ok() && hasActivation && policyOk
        ? stage("pass", "Institutional activation evidence and pinned template confirmed over session.")
        : stage(
            healthRes.ok() ? "blocked" : "fail",
            healthRes.ok()
              ? "Integration health reachable but institutional template/activation evidence incomplete."
              : `Integration health HTTP ${healthRes.status()}.`,
          );
    } else {
      stages.institutional_configuration = stage("blocked", "Requires confirmed application access.");
    }

    const studioPath =
      "/developers/integration-studio?pack=sandbox_institutional_protocol_access&path=institutional_eligibility_gate&action=org_protocol_access&category=institutional_eligibility&environment=sandbox";
    await page.goto(`${base}${studioPath}`, { waitUntil: "networkidle", timeout: 120_000 });
    routesTested.push(studioPath);

    const sessionAfterNav = await observeSession(base, request, "session_after_navigation");
    apiObservations.push(sessionAfterNav.observation);

    await page.reload({ waitUntil: "networkidle", timeout: 120_000 });
    const sessionAfterRefresh = await observeSession(base, request, "session_after_refresh");
    apiObservations.push(sessionAfterRefresh.observation);

    const sessionPersists =
      sessionAfterNav.observation.authenticated === true
      && sessionAfterRefresh.observation.authenticated === true
      && sessionAfterRefresh.observation.partner_id === sessionAfterSignIn.observation.partner_id;

    if (stages.partner_authentication?.status === "pass" && !sessionPersists) {
      stages.partner_authentication = stage(
        "fail",
        "Session did not remain authenticated after navigation and refresh.",
      );
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}${launchpadPath}`, { waitUntil: "networkidle", timeout: 120_000 });
    const mobileShot = join(outDir, "build584-browser/launchpad-mobile-390.png");
    await page.screenshot({ path: mobileShot, fullPage: true });
    evidenceSources.push(mobileShot);
    routesTested.push(`${launchpadPath}@390px`);

    const studioShot = join(outDir, "build584-browser/integration-studio-desktop.png");
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: studioShot, fullPage: true });
    evidenceSources.push(studioShot);
  } finally {
    await browser.close();
  }

  const partnerAuthConfirmed = stages.partner_authentication?.status === "pass";
  const artifact = buildArtifact({
    agentGitSha,
    base,
    recordedAt,
    routesTested,
    evidenceSources,
    apiObservations,
    stages,
    partnerAuthConfirmed,
  });
  writeArtifact(outDir, artifact);
  console.log(JSON.stringify(artifact, null, 2));
  process.exit(stages.partner_authentication?.status === "fail" ? 1 : 0);
}

function buildArtifact(input: {
  agentGitSha: string;
  base: string;
  recordedAt: string;
  routesTested: string[];
  evidenceSources: string[];
  apiObservations: BrowserApiObservation[];
  stages: Partial<Record<BrowserStageId, BrowserStageRecord>>;
  partnerAuthConfirmed: boolean;
}): Build584BrowserAcceptanceArtifact {
  const walkthroughComplete =
    input.partnerAuthConfirmed
    && input.stages.application_access?.status === "pass"
    && input.stages.institutional_configuration?.status === "pass"
    && input.stages.hosted_holder_authorization?.status === "pass"
    && input.stages.independent_receipt_verification?.status === "pass";

  return {
    ok: walkthroughComplete,
    build: 584,
    build_identity: input.agentGitSha,
    environment: input.base,
    recorded_at: input.recordedAt,
    partner_authentication_confirmed: input.partnerAuthConfirmed,
    walkthrough_complete: walkthroughComplete,
    routes_tested: input.routesTested,
    evidence_sources: input.evidenceSources,
    api_observations: input.apiObservations,
    stages: input.stages,
  };
}

function writeArtifact(outDir: string, artifact: Build584BrowserAcceptanceArtifact) {
  const path = join(outDir, "build584-authenticated-browser-acceptance.json");
  writeFileSync(path, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  const mirror = "/opt/cursor/artifacts/build584-authenticated-browser-acceptance.json";
  try {
    mkdirSync("/opt/cursor/artifacts", { recursive: true });
    writeFileSync(mirror, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  } catch {
    // optional mirror
  }
  console.error(`Wrote ${path}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
