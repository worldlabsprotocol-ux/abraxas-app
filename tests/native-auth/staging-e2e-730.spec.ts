import { test, expect } from "@playwright/test";

async function assertNativeReady(request: import("@playwright/test").APIRequestContext) {
  const enabledRes = await request.get("/api/auth/native/enabled");
  const body = await enabledRes.json();
  test.skip(!body.enabled, `Native auth disabled (flag_state=${body.runtime?.native_auth_flag_state ?? "unknown"})`);
  expect(body.runtime?.memory_store).toBe(false);
  expect(body.runtime?.supabase_project_ref).toBe("ocntwbxarpjeixdnzide");
  const host = new URL(process.env.NATIVE_AUTH_BASE_URL ?? "http://127.0.0.1").hostname;
  expect(body.webauthn?.rp_id).toBe(host);
  return body;
}

async function registerPasskeyAccount(page: import("@playwright/test").Page, context: import("@playwright/test").BrowserContext) {
  const client = await context.newCDPSession(page);
  await client.send("WebAuthn.enable");
  const { authenticatorId } = await client.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
    },
  });
  await page.goto("/#start-sandbox");
  await page.getByRole("button", { name: /Create account/i }).click();
  await expect(page.getByText("Step 2 — Provision your tenant-scoped sandbox")).toBeVisible({ timeout: 90_000 });
  const session = await page.request.get("/api/auth/native/session");
  const sessionJson = await session.json();
  expect(sessionJson.authenticated).toBe(true);
  expect(sessionJson.account_id).toMatch(/^abx_ac_/);
  return { client, authenticatorId, accountId: sessionJson.account_id as string };
}

test.describe("Build #730 staging HTTPS acceptance", () => {
  test("passkey register, refresh, sign-out, sign-in, revoke", async ({ page, context, request }) => {
    await assertNativeReady(request);

    const { client, authenticatorId, accountId } = await registerPasskeyAccount(page, context);

    await page.reload();
    expect((await (await page.request.get("/api/auth/native/session")).json()).account_id).toBe(accountId);

    await page.request.delete("/api/auth/native/session");
    expect((await (await page.request.get("/api/auth/native/session")).json()).authenticated).toBe(false);

    const enrollBlocked = await page.request.post("/api/sandbox/enroll", {
      headers: { "content-type": "application/json" },
      data: { application_name: "Should fail" },
    });
    expect(enrollBlocked.status()).toBeGreaterThanOrEqual(401);

    await page.goto("/#start-sandbox");
    await page.locator(".abx-sandbox-entry__link").filter({ hasText: "Sign in" }).click();
    await page.getByRole("button", { name: /^Sign in$/i }).click();
    await expect(page.getByText("Step 2 — Provision your tenant-scoped sandbox")).toBeVisible({ timeout: 90_000 });
    expect((await (await page.request.get("/api/auth/native/session")).json()).account_id).toBe(accountId);

    await page.request.delete("/api/auth/native/session");
    expect((await (await page.request.get("/api/auth/native/session")).json()).authenticated).toBe(false);

    await client.send("WebAuthn.removeVirtualAuthenticator", { authenticatorId });
  });

  test("sandbox enroll, launchpad access, return sign-in, idempotent enroll", async ({ page, context, request }) => {
    await assertNativeReady(request);

    const { client, authenticatorId, accountId } = await registerPasskeyAccount(page, context);

    await page.getByRole("button", { name: "Start sandbox" }).click();
    await page.waitForURL(/\/developers\/launchpad/, { timeout: 120_000 });

    const first = await page.request.post("/api/sandbox/enroll", {
      headers: { "content-type": "application/json" },
      data: { application_name: "Build 730 staging app" },
    });
    const firstJson = await first.json();
    expect(first.ok(), JSON.stringify(firstJson)).toBeTruthy();
    const partnerId = firstJson.partner_id as string;
    expect(partnerId).toBeTruthy();

    const second = await page.request.post("/api/sandbox/enroll", {
      headers: { "content-type": "application/json" },
      data: { application_name: "Build 730 duplicate" },
    });
    const secondJson = await second.json();
    expect(second.ok()).toBeTruthy();
    expect(secondJson.partner_id).toBe(partnerId);
    expect(secondJson.application?.idempotency_replay).toBe(true);

    await page.request.delete("/api/auth/native/session");
    await page.goto("/#start-sandbox");
    await page.locator(".abx-sandbox-entry__link").filter({ hasText: "Sign in" }).click();
    await page.getByRole("button", { name: /^Sign in$/i }).click();
    await expect(page.getByText("Step 2")).toBeVisible({ timeout: 90_000 });
    expect((await (await page.request.get("/api/auth/native/session")).json()).account_id).toBe(accountId);

    await client.send("WebAuthn.removeVirtualAuthenticator", { authenticatorId });
  });

  test("origin mismatch and missing session are rejected", async ({ request }) => {
    await assertNativeReady(request);

    const opts = await request.post("/api/auth/native/passkey/register/options", {
      headers: { "content-type": "application/json" },
      data: {},
    });
    expect(opts.ok()).toBeTruthy();
    const optsJson = await opts.json();
    const challengeId = optsJson.challenge_id as string;
    expect(challengeId).toBeTruthy();

    const badOrigin = await request.post("/api/auth/native/passkey/register/verify", {
      headers: {
        "content-type": "application/json",
        origin: "https://evil.example",
      },
      data: {
        challenge_id: challengeId,
        credential: { id: "x", rawId: "x", type: "public-key", response: {} },
      },
    });
    expect(badOrigin.status()).toBeGreaterThanOrEqual(400);

    const expiredSession = await request.post("/api/sandbox/enroll", {
      headers: { "content-type": "application/json" },
      data: { application_name: "no session" },
    });
    expect(expiredSession.status()).toBeGreaterThanOrEqual(401);

    const zk = await request.get("/api/auth/zklogin/me");
    expect([401, 403, 404]).toContain(zk.status());
  });
});
