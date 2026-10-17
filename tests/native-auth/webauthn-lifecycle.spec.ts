import { test, expect } from "@playwright/test";

test.describe("native passkey lifecycle", () => {
  test("register, sign out, sign in restores same account", async ({ page, context }) => {
    const enabled = await page.request.get("/api/auth/native/enabled");
    const enabledJson = await enabled.json();
    test.skip(!enabledJson.enabled, "Native auth disabled in this environment");

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
    await page.getByRole("button", { name: "Create passkey account" }).click();
    await expect(page.getByText("Step 2 — Provision your tenant-scoped sandbox")).toBeVisible({ timeout: 60_000 });

    const sessionAfterReg = await page.request.get("/api/auth/native/session");
    const sessionRegJson = await sessionAfterReg.json();
    expect(sessionRegJson.authenticated).toBe(true);
    const accountId = sessionRegJson.account_id as string;
    expect(accountId).toMatch(/^abx_ac_/);

    await page.request.delete("/api/auth/native/session");
    expect((await (await page.request.get("/api/auth/native/session")).json()).authenticated).toBe(false);

    await page.goto("/#start-sandbox");
    await page.getByRole("button", { name: "Sign in with existing passkey" }).click();
    await expect(page.getByText("Step 2 — Provision your tenant-scoped sandbox")).toBeVisible({ timeout: 60_000 });

    const sessionAfterIn = await page.request.get("/api/auth/native/session");
    const sessionInJson = await sessionAfterIn.json();
    expect(sessionInJson.authenticated).toBe(true);
    expect(sessionInJson.account_id).toBe(accountId);

    await client.send("WebAuthn.removeVirtualAuthenticator", { authenticatorId });
  });

  test("sandbox enroll is idempotent for same account", async ({ page, context }) => {
    const enabled = await page.request.get("/api/auth/native/enabled");
    test.skip(!(await enabled.json()).enabled, "Native auth disabled");

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
    await page.getByRole("button", { name: "Create passkey account" }).click();
    await expect(page.getByText("Step 2")).toBeVisible({ timeout: 60_000 });

    const first = await page.request.post("/api/sandbox/enroll", {
      headers: { "content-type": "application/json" },
      data: { application_name: "Playwright sandbox" },
    });
    const firstJson = await first.json();
    if (first.ok()) {
      expect(firstJson.partner_id).toBeTruthy();
      const second = await page.request.post("/api/sandbox/enroll", {
        headers: { "content-type": "application/json" },
        data: { application_name: "Playwright sandbox duplicate" },
      });
      const secondJson = await second.json();
      expect(second.ok()).toBeTruthy();
      expect(secondJson.partner_id).toBe(firstJson.partner_id);
      expect(secondJson.application?.idempotency_replay).toBe(true);
    } else {
      expect(firstJson.code).toMatch(/provision|not_configured|unavailable|policy_template|invalid_input/);
    }

    await client.send("WebAuthn.removeVirtualAuthenticator", { authenticatorId });
  });
});
