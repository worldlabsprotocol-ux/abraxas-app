import { test, expect } from "@playwright/test";
import { fetchDeploymentIdentity, fetchWalletOperational } from "./unifiedWorkspaceStagingHelpers";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const ARTIFACT_DIR = "/opt/cursor/artifacts/build-890/playwright";

/**
 * Build 890 — extends 889 with expanded contract boundary checks on Preview.
 */
test.describe("Build 890 founder journey contract", () => {
  test.beforeAll(() => {
    mkdirSync(ARTIFACT_DIR, { recursive: true });
  });

  test("deployment identity recorded", async ({ request, baseURL }) => {
    const base = baseURL?.replace(/\/$/, "");
    if (!base) test.skip(true, "BLOCKED: set LAUNCHPAD_STAGING_URL");
    const identity = await fetchDeploymentIdentity(request, base);
    writeFileSync(
      resolve(ARTIFACT_DIR, "deployment-identity.json"),
      `${JSON.stringify(identity, null, 2)}\n`,
    );
    expect(typeof identity.commit_sha).toBe("string");
  });

  test("sandbox validate POST rejects unknown_field without session", async ({ request, baseURL }) => {
    const base = baseURL?.replace(/\/$/, "");
    if (!base) test.skip(true, "BLOCKED: set LAUNCHPAD_STAGING_URL");
    const res = await request.post(`${base}/api/auth/wallet/sandbox/validate`, {
      data: { receipt: {}, forged: true },
      failOnStatusCode: false,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("unknown_field");
  });

  test("wallet operational checkpoint metadata", async ({ request, baseURL }) => {
    const base = baseURL?.replace(/\/$/, "");
    if (!base) test.skip(true, "BLOCKED: set LAUNCHPAD_STAGING_URL");
    const wallet = await fetchWalletOperational(request, base);
    writeFileSync(
      resolve(ARTIFACT_DIR, "wallet-operational.json"),
      `${JSON.stringify(wallet, null, 2)}\n`,
    );
    expect(wallet).toBeTruthy();
  });
});
