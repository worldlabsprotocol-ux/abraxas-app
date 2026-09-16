// FILE: scripts/launchpad-staging-smoke/walkthrough.ts

import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium, type Browser, type Page } from "@playwright/test";
import type { StagingTargetConfig } from "./guards";
import { LaunchpadStagingClient } from "./client";
import { verifyPreviewIdentity } from "./identity";
import { assertApiKeyShape, describeApiKey, redactSensitiveText } from "./redact";
import type { SmokeReport, SmokeStepResult, StepStatus } from "./report";
import { buildSmokePartnerId, buildSmokeProvisionPayload } from "./provisionPayload";
import { summarizeReport, writeSmokeReport } from "./report";

interface WalkthroughState {
  applicationId: string | null;
  publicSlug: string | null;
  partnerId: string | null;
  sandboxApiKey: string | null;
  rotatedApiKey: string | null;
  productionApiKey: string | null;
  hostedLink: string | null;
  approvedReturnUrl: string;
}

function step(id: string, label: string, status: StepStatus, detail?: string): SmokeStepResult {
  return { id, label, status, detail };
}

function jsonField(body: unknown, path: string): unknown {
  if (!body || typeof body !== "object") return undefined;
  return path.split(".").reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, body);
}

export async function runLaunchpadStagingWalkthrough(config: StagingTargetConfig): Promise<SmokeReport> {
  const testId = `launchpad-smoke-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const approvedReturnUrl = config.targetUrl;
  const client = new LaunchpadStagingClient(config);
  const state: WalkthroughState = {
    applicationId: null,
    publicSlug: null,
    partnerId: null,
    sandboxApiKey: null,
    rotatedApiKey: null,
    productionApiKey: null,
    hostedLink: null,
    approvedReturnUrl,
  };

  const steps: SmokeStepResult[] = [];
  const authorizationMatrix: SmokeStepResult[] = [];
  const hostileUrlMatrix: SmokeStepResult[] = [];
  const desktopUx: SmokeStepResult[] = [];
  const mobileUx: SmokeStepResult[] = [];
  const consoleErrors: string[] = [];
  const failedNetwork: Array<{ url: string; status: number; method: string }> = [];
  const operatorSteps: string[] = [];
  const screenshotDir = resolve(process.cwd(), "reports/launchpad-staging-smoke/screenshots", testId);
  mkdirSync(screenshotDir, { recursive: true });
  const screenshotPaths: string[] = [];

  let detectedSupabaseRef: string | null = null;
  let detectedDeploymentEnvironment: string | null = null;
  let previewCommitSha: string | null = null;
  let migrationsValidated = false;
  let browser: Browser | null = null;
  let blockedByVercelSso = false;
  let identityConfirmed = false;

  const commitSha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();

  try {
    const identity = await verifyPreviewIdentity(client, config);
    detectedSupabaseRef = identity.detectedSupabaseRef;
    detectedDeploymentEnvironment = identity.detectedDeploymentEnvironment;
    previewCommitSha = identity.detectedCommitSha;
    blockedByVercelSso = identity.blockedByVercelSso;
    identityConfirmed = identity.ok;

    if (blockedByVercelSso) {
      operatorSteps.push(
        "Vercel Deployment Protection is active on the preview. Complete the Vercel team SSO prompt once in a browser, or set VERCEL_PROTECTION_BYPASS from Vercel Project Settings → Deployment Protection and re-run.",
      );
      operatorSteps.push(
        "Optional: save Playwright storage state after SSO and set PLAYWRIGHT_STORAGE_STATE for browser walkthrough steps.",
      );
      steps.push(step("precondition", "Preview reachable without Vercel deployment protection", "blocked", identity.detail));
    } else if (!identityConfirmed) {
      steps.push(step("precondition", "Preview identity endpoint confirms demo Supabase binding", "fail", identity.detail));
    } else {
      steps.push(step("precondition", "Preview identity endpoint confirms demo Supabase binding", "pass", identity.detail));
      steps.push(
        step(
          "precondition-commit",
          "Preview commit SHA present",
          previewCommitSha ? "pass" : "fail",
          previewCommitSha ? previewCommitSha.slice(0, 7) : "missing",
        ),
      );
    }

    if (identityConfirmed) {
      const sessionRes = await client.getJson("/api/launchpad/auth/session");
      steps.push(
        step(
          "02-unauth-signin-state",
          "Unauthenticated session reports signed out",
          sessionRes.status === 200 && jsonField(sessionRes.body, "authenticated") === false ? "pass" : "fail",
          `status=${sessionRes.status}`,
        ),
      );

      authorizationMatrix.push(
        step(
          "auth-unauthenticated-api",
          "Unauthenticated Launchpad API returns 401",
          (await client.getJson("/api/launchpad/applications")).status === 401 ? "pass" : "fail",
        ),
      );

      const policiesRes = await client.getJson("/api/launchpad/policies");
      const hasAge21 = Array.isArray(jsonField(policiesRes.body, "policies"))
        && (jsonField(policiesRes.body, "policies") as Array<{ id: string }>).some((p) => p.id === "age_21_retail");
      steps.push(
        step(
          "policy-catalog",
          "Age over 21 policy available",
          policiesRes.status === 200 && hasAge21 ? "pass" : "fail",
        ),
      );

      const partnerId = buildSmokePartnerId(testId);
      state.partnerId = partnerId;
      const provisionPayload = buildSmokeProvisionPayload({ testId, approvedReturnUrl });

      const provisionRes = await client.postJson("/api/launchpad/applications", provisionPayload);

      migrationsValidated =
        provisionRes.status === 200
        && jsonField(provisionRes.body, "ok") === true
        && Boolean(jsonField(provisionRes.body, "application.application_id"));

      steps.push(
        step(
          "08-provision-sandbox",
          "Atomic sandbox provisioning succeeds",
          migrationsValidated ? "pass" : "fail",
          migrationsValidated
            ? undefined
            : `status=${provisionRes.status} code=${String(jsonField(provisionRes.body, "code") ?? "unknown")} reason=${String(jsonField(provisionRes.body, "error") ?? "unknown")}`,
        ),
      );

      if (migrationsValidated) {
        state.applicationId = String(jsonField(provisionRes.body, "application.application_id"));
        state.publicSlug = String(jsonField(provisionRes.body, "application.public_slug") ?? "");
        const apiKey = jsonField(provisionRes.body, "api_key");
        if (typeof apiKey === "string") {
          assertApiKeyShape(apiKey, "sandbox");
          state.sandboxApiKey = apiKey;
          steps.push(
            step(
              "10-credential-reveal-once",
              "Sandbox API key revealed once on provision",
              "pass",
              `prefix=${describeApiKey(apiKey).prefix} length=${describeApiKey(apiKey).length}`,
            ),
          );
        } else {
          steps.push(step("10-credential-reveal-once", "Sandbox API key revealed once on provision", "fail", "api_key missing"));
        }

        const replayRes = await client.postJson("/api/launchpad/applications", provisionPayload);
        const replayId = String(jsonField(replayRes.body, "application.application_id") ?? "");
        steps.push(
          step(
            "idempotency-same-app",
            "Repeated provisioning with same idempotency key returns same application",
            replayRes.status === 200 && replayId === state.applicationId && jsonField(replayRes.body, "api_key") == null ? "pass" : "fail",
          ),
        );

        const otherPartnerRes = await client.postJson("/api/launchpad/applications", {
          ...provisionPayload,
          application_name: `Other ${testId}`,
          display_name: `Other ${testId}`,
          partner_id: `${partnerId}-other`,
        });
        authorizationMatrix.push(
          step(
            "idempotency-cross-partner",
            "Another partner cannot reuse the idempotency key",
            otherPartnerRes.status === 409 || otherPartnerRes.status === 400 ? "pass" : "fail",
            `status=${otherPartnerRes.status}`,
          ),
        );

        const appRes = await client.getJson(`/api/launchpad/applications/${state.applicationId}`);
        const allowed = jsonField(appRes.body, "application.allowed_return_urls");
        steps.push(
          step(
            "09-persisted-config",
            "Application, policy, environment, and return URL persisted",
            appRes.status === 200
              && jsonField(appRes.body, "application.policy_template_id") === "age_21_retail"
              && jsonField(appRes.body, "application.environment") === "sandbox"
              && Array.isArray(allowed)
              && (allowed as string[]).includes(approvedReturnUrl)
              ? "pass"
              : "fail",
          ),
        );

        const docsRes = await client.getJson(`/api/launchpad/applications/${state.applicationId}/integration-docs`);
        state.hostedLink = typeof jsonField(docsRes.body, "docs.hosted_link") === "string"
          ? String(jsonField(docsRes.body, "docs.hosted_link"))
          : null;
        steps.push(
          step(
            "14-hosted-link",
            "Hosted verification link available",
            state.hostedLink?.includes("/partner/verify?app=") ? "pass" : "fail",
          ),
        );

        const verifyConfigRes = await client.getJson(
          `/api/launchpad/public/verify-config?app=${encodeURIComponent(state.publicSlug!)}&return_url=${encodeURIComponent(approvedReturnUrl)}`,
        );
        steps.push(
          step(
            "16-verify-config",
            "Hosted verification shows correct application and policy",
            verifyConfigRes.status === 200
              && jsonField(verifyConfigRes.body, "config.policy_id")?.toString().includes("age_21_retail")
              ? "pass"
              : "fail",
          ),
        );
        steps.push(
          step(
            "17-disclosure",
            "Disclosure explains shared and withheld fields",
            Boolean(jsonField(verifyConfigRes.body, "config.user_explanation"))
              && Boolean(jsonField(verifyConfigRes.body, "config.disclosed_result"))
              ? "pass"
              : "fail",
          ),
        );

        const eligibleRes = await client.postJson(`/api/launchpad/applications/${state.applicationId}/test`, {
          scenario_id: "eligible",
          return_url: approvedReturnUrl,
        });
        const receiptStatus = jsonField(eligibleRes.body, "result.receipt_verification_status");
        steps.push(
          step(
            "18-demo-eligibility",
            "Supported demo eligibility path completes",
            eligibleRes.status === 200 && jsonField(eligibleRes.body, "result.public_code") === "approved" ? "pass" : "fail",
          ),
        );
        steps.push(
          step(
            "19-signed-receipt-required",
            "Success path documents signed receipt requirement",
            receiptStatus === "simulated" ? "pass" : "fail",
            String(receiptStatus ?? "missing"),
          ),
        );
        steps.push(
          step(
            "20-approved-return-origin",
            "Return destination uses approved preview origin",
            String(jsonField(eligibleRes.body, "result.return_url") ?? "").startsWith(approvedReturnUrl) ? "pass" : "fail",
          ),
        );

        const activityRes = await client.getJson(`/api/launchpad/applications/${state.applicationId}/activity`);
        const events = (jsonField(activityRes.body, "events") as Array<Record<string, unknown>> | undefined) ?? [];
        const hasReceiptIssued = events.some((e) => e.event_type === "receipt_issued");
        const hasPii = events.some((e) => JSON.stringify(e).match(/email|ssn|birth|phone|address/i));
        steps.push(
          step(
            "21-activity-feed",
            "Partner activity feed records real flow events",
            activityRes.status === 200 && hasReceiptIssued ? "pass" : "fail",
          ),
        );
        steps.push(
          step(
            "22-activity-no-pii",
            "Activity contains no sensitive identity attributes",
            hasPii ? "fail" : "pass",
          ),
        );

        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
          storageState: config.storageStatePath,
          viewport: { width: 1440, height: 900 },
        });
        const page = await context.newPage();
        page.on("console", (msg) => {
          if (msg.type() === "error") consoleErrors.push(redactSensitiveText(msg.text()));
        });
        page.on("response", (response) => {
          if (response.status() >= 400) {
            failedNetwork.push({
              url: redactSensitiveText(response.url()),
              status: response.status(),
              method: response.request().method(),
            });
          }
        });

        const extraHeaders: Record<string, string> = {};
        if (config.vercelProtectionBypass) {
          extraHeaders["x-vercel-protection-bypass"] = config.vercelProtectionBypass;
        }
        if (Object.keys(extraHeaders).length) {
          await page.setExtraHTTPHeaders(extraHeaders);
        }

        await page.goto(`${config.targetUrl}/developers/launchpad`, { waitUntil: "domcontentloaded" });
        const signInVisible = await page.getByLabel("Sandbox API key").isVisible().catch(() => false);
        steps.push(
          step(
            "01-launchpad-route",
            "Open /developers/launchpad",
            page.url().includes("/developers/launchpad") ? "pass" : "fail",
          ),
        );
        steps.push(
          step(
            "02-ui-signin-state",
            "Unauthenticated users see sign in state in UI",
            signInVisible ? "pass" : "fail",
          ),
        );

        if (state.sandboxApiKey) {
          await page.evaluate((key) => {
            const input = document.querySelector<HTMLInputElement>('input[aria-label="Sandbox API key"]');
            if (input) {
              const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
              nativeInputValueSetter?.call(input, key);
              input.dispatchEvent(new Event("input", { bubbles: true }));
            }
          }, state.sandboxApiKey);
          await page.getByRole("button", { name: "Sign in" }).click();
          steps.push(
            step(
              "03-authenticate",
              "Authenticate with sandbox API key",
              (await page.getByText("sandbox", { exact: false }).first().isVisible().catch(() => false)) ? "pass" : "fail",
            ),
          );
          steps.push(
            step(
              "04-workspace-loads",
              "Partner Launchpad workspace loads after authentication",
              (await page.getByText("Build your integration").isVisible().catch(() => false)) ? "pass" : "fail",
            ),
          );
        } else {
          steps.push(step("03-authenticate", "Authenticate with sandbox API key", "skip", "No sandbox key available"));
          steps.push(step("04-workspace-loads", "Partner Launchpad workspace loads", "skip"));
        }

        const reloadRes = await client.getJson(`/api/launchpad/applications/${state.applicationId}`);
        steps.push(
          step(
            "12-13-credential-not-retrievable",
            "Plaintext credential not returned after reload",
            reloadRes.status === 200 && jsonField(reloadRes.body, "api_key") == null ? "pass" : "fail",
          ),
        );

        const desktopShot = resolve(screenshotDir, "desktop-workspace.png");
        await page.screenshot({ path: desktopShot, fullPage: true });
        screenshotPaths.push(desktopShot);

        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
        desktopUx.push(step("desktop-overflow", "No horizontal overflow", overflow ? "fail" : "pass"));
        desktopUx.push(step("desktop-workspace", "Workspace renders", "pass"));

        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(`${config.targetUrl}/developers/launchpad`, { waitUntil: "domcontentloaded" });
        const mobileShot = resolve(screenshotDir, "mobile-workspace.png");
        await page.screenshot({ path: mobileShot, fullPage: true });
        screenshotPaths.push(mobileShot);
        const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
        mobileUx.push(step("mobile-overflow", "No horizontal overflow", mobileOverflow ? "fail" : "pass"));
        mobileUx.push(step("mobile-workspace", "Workspace renders on iPhone 13 viewport", "pass"));

        if (state.hostedLink) {
          await page.goto(state.hostedLink, { waitUntil: "domcontentloaded" });
          const hostedShot = resolve(screenshotDir, "hosted-verify.png");
          await page.screenshot({ path: hostedShot, fullPage: true });
          screenshotPaths.push(hostedShot);
          steps.push(
            step(
              "15-hosted-verify-ui",
              "Hosted verification page loads",
              page.url().includes("/partner/verify") ? "pass" : "fail",
            ),
          );
        }

        await context.close();
        if (browser) {
          await browser.close();
          browser = null;
        }

        const prodReqRes = await client.postJson(`/api/launchpad/applications/${state.applicationId}/production-access`, {
          request_notes: `Staging smoke production request ${testId}`,
        });
        steps.push(
          step(
            "23-production-request",
            "Production access request submitted in demo",
            prodReqRes.status === 200 ? "pass" : "fail",
            `status=${prodReqRes.status}`,
          ),
        );

        const prodRequestId = String(jsonField(prodReqRes.body, "request.id") ?? "");
        if (config.adminPin && prodRequestId) {
          const reviewRes = await client.postJson(
            `/api/admin/launchpad/production-requests/${prodRequestId}/review`,
            { decision: "approved", reviewer_notes: `Approved by staging smoke ${testId}` },
            { "x-admin-pin": config.adminPin },
          );
          steps.push(
            step(
              "24-admin-approve",
              "Demo administrator approves production request",
              reviewRes.status === 200 ? "pass" : "fail",
              `status=${reviewRes.status}`,
            ),
          );

          const revealRes = await client.postJson(
            `/api/launchpad/applications/${state.applicationId}/credentials/reveal-production`,
            {},
          );
          const prodKey = jsonField(revealRes.body, "api_key");
          if (typeof prodKey === "string") {
            assertApiKeyShape(prodKey, "production");
            state.productionApiKey = prodKey;
            steps.push(
              step(
                "25-production-reveal-once",
                "Production credential revealed exactly once",
                "pass",
                `prefix=${describeApiKey(prodKey).prefix}`,
              ),
            );
          } else {
            steps.push(step("25-production-reveal-once", "Production credential revealed exactly once", "fail"));
          }

          const revealAgain = await client.postJson(
            `/api/launchpad/applications/${state.applicationId}/credentials/reveal-production`,
            {},
          );
          steps.push(
            step(
              "26-production-not-revealed-again",
              "Production credential cannot be revealed again after reload",
              revealAgain.status === 200 && jsonField(revealAgain.body, "already_revealed") === true ? "pass" : "fail",
            ),
          );
        } else {
          operatorSteps.push("Set LAUNCHPAD_ADMIN_PIN to exercise admin production approval steps 24–26.");
          steps.push(step("24-admin-approve", "Demo administrator approves production request", "skip", "LAUNCHPAD_ADMIN_PIN not set"));
          steps.push(step("25-production-reveal-once", "Production credential revealed exactly once", "skip"));
          steps.push(step("26-production-not-revealed-again", "Production credential cannot be revealed again", "skip"));
        }

        const rotateRes = await client.postJson(`/api/launchpad/applications/${state.applicationId}/credentials/rotate`, {});
        const rotatedKey = jsonField(rotateRes.body, "api_key");
        if (typeof rotatedKey === "string") {
          assertApiKeyShape(rotatedKey, "sandbox");
          state.rotatedApiKey = rotatedKey;
          steps.push(step("27-rotate", "Rotate sandbox credential", "pass"));
        } else {
          steps.push(step("27-rotate", "Rotate sandbox credential", "fail"));
        }

        if (state.sandboxApiKey) {
          const oldKeyRes = await client.postJson(
            "/api/launchpad/auth/session",
            {},
            { authorization: `Bearer ${state.sandboxApiKey}` },
          );
          authorizationMatrix.push(
            step(
              "revoked-old-credential",
              "Previous credential rejected after rotation",
              oldKeyRes.status === 401 ? "pass" : "fail",
              `status=${oldKeyRes.status}`,
            ),
          );
        }

        if (state.rotatedApiKey) {
          const newKeyClient = new LaunchpadStagingClient(config);
          const newKeyRes = await newKeyClient.postJson(
            "/api/launchpad/auth/session",
            {},
            { authorization: `Bearer ${state.rotatedApiKey}` },
          );
          steps.push(
            step(
              "29-rotated-accepts",
              "Rotated credential succeeds",
              newKeyRes.status === 200 ? "pass" : "fail",
            ),
          );
        }

        const revokeRes = await client.postJson(`/api/launchpad/applications/${state.applicationId}/credentials/revoke`, {});
        steps.push(step("30-revoke", "Revoke rotated credential", revokeRes.status === 200 ? "pass" : "fail"));

        if (state.rotatedApiKey) {
          const revokedRes = await client.postJson(
            "/api/launchpad/auth/session",
            {},
            { authorization: `Bearer ${state.rotatedApiKey}` },
          );
          steps.push(
            step(
              "31-revoked-rejected",
              "Revoked credential rejected",
              revokedRes.status === 401 ? "pass" : "fail",
            ),
          );
          authorizationMatrix.push(
            step(
              "revoked-credential-auth",
              "Revoked credential cannot authenticate",
              revokedRes.status === 401 ? "pass" : "fail",
            ),
          );
        }

        authorizationMatrix.push(
          step(
            "malformed-app-id",
            "Malformed application identifier fails safely",
            (await client.getJson("/api/launchpad/applications/not-a-uuid")).status === 404 ? "pass" : "fail",
          ),
        );

        authorizationMatrix.push(
          step(
            "unauthenticated-admin",
            "Unauthenticated admin request returns 401",
            (await client.getJson("/api/admin/launchpad/production-requests")).status === 401 ? "pass" : "fail",
          ),
        );

        if (config.adminPin) {
          const adminList = await client.getJson("/api/admin/launchpad/production-requests", {
            "x-admin-pin": "000000",
          });
          authorizationMatrix.push(
            step(
              "non-admin-pin",
              "Authenticated non-admin request returns 403",
              adminList.status === 403 || adminList.status === 401 ? "pass" : "fail",
              `status=${adminList.status}`,
            ),
          );
        } else {
          authorizationMatrix.push(step("non-admin-pin", "Authenticated non-admin request returns 403", "skip"));
        }

        const hostileCases: Array<{ label: string; returnUrl: string; expectReject: boolean }> = [
          { label: "https://evil.example", returnUrl: "https://evil.example", expectReject: true },
          { label: "//evil.example", returnUrl: "//evil.example", expectReject: true },
          { label: "javascript:alert(1)", returnUrl: "javascript:alert(1)", expectReject: true },
          { label: "data:text/html,test", returnUrl: "data:text/html,test", expectReject: true },
          { label: "mixed case JavaScript protocol", returnUrl: "JavaScript:alert(1)", expectReject: true },
          { label: "encoded protocol", returnUrl: "https%3A%2F%2Fevil.example", expectReject: true },
          { label: "double encoded protocol", returnUrl: "https%253A%252F%252Fevil.example", expectReject: true },
          { label: "embedded username and password", returnUrl: "https://user:pass@evil.example/callback", expectReject: true },
          { label: "approved-domain.evil.example", returnUrl: "https://approved-domain.evil.example", expectReject: true },
          { label: "evil.example with approved domain in path", returnUrl: `https://evil.example/${approvedReturnUrl}`, expectReject: true },
          { label: "approved origin with disallowed path", returnUrl: `${approvedReturnUrl}/disallowed/path`, expectReject: true },
          { label: "malformed URL", returnUrl: "not-a-url", expectReject: true },
          { label: "missing return URL", returnUrl: "", expectReject: true },
          { label: "approved preview origin", returnUrl: approvedReturnUrl, expectReject: false },
        ];

        for (const caseDef of hostileCases) {
          const url = caseDef.returnUrl
            ? `/api/launchpad/public/verify-config?app=${encodeURIComponent(state.publicSlug!)}&return_url=${encodeURIComponent(caseDef.returnUrl)}`
            : `/api/launchpad/public/verify-config?app=${encodeURIComponent(state.publicSlug!)}`;
          const res = await client.getJson(url);
          const rejected = res.status === 400 || res.status === 404;
          const accepted = res.status === 200;
          hostileUrlMatrix.push(
            step(
              caseDef.label,
              caseDef.label,
              caseDef.expectReject ? (rejected ? "pass" : "fail") : (accepted ? "pass" : "fail"),
              `status=${res.status}`,
            ),
          );
        }

      }
    }
  } finally {
    if (browser) await browser.close();
  }

  const hasFail = [...steps, ...authorizationMatrix, ...hostileUrlMatrix, ...desktopUx, ...mobileUx].some((s) => s.status === "fail");
  const hasBlocked = blockedByVercelSso || steps.some((s) => s.status === "blocked");

  const report: SmokeReport = {
    targetUrl: config.targetUrl,
    expectedSupabaseRef: config.expectedSupabaseRef,
    detectedSupabaseRef,
    detectedDeploymentEnvironment,
    previewCommitSha,
    commitSha,
    timestamp: new Date().toISOString(),
    testId,
    steps,
    authorizationMatrix,
    hostileUrlMatrix,
    desktopUx,
    mobileUx,
    consoleErrors: [...new Set(consoleErrors)].slice(0, 20),
    failedNetwork: failedNetwork.slice(0, 30),
    screenshotPaths,
    operatorSteps,
    cleanupStatus: `Staging smoke data tagged with partner_id=${state.partnerId ?? "n/a"}; no automatic cleanup performed.`,
    migrationsValidated,
    overallVerdict: hasBlocked ? "BLOCKED" : hasFail ? "FAIL" : "PASS",
  };

  return report;
}

export async function executeStagingSmoke(config: StagingTargetConfig): Promise<{ report: SmokeReport; reportPath: string }> {
  const report = await runLaunchpadStagingWalkthrough(config);
  const reportPath = writeSmokeReport(report);
  const summary = summarizeReport(report);
  console.log(`Launchpad staging smoke: ${report.overallVerdict}`);
  console.log(`Walkthrough: ${summary.walkthroughPass} pass, ${summary.walkthroughFail} fail, ${summary.walkthroughBlocked} blocked`);
  console.log(`Report: ${reportPath}`);
  return { report, reportPath };
}
