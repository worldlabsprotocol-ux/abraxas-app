import { test, expect } from "@playwright/test";

/**
 * HTTP failure-mode checks against a deployed preview (requires VERCEL_PROTECTION_BYPASS when protected).
 * Skips when native auth is disabled on the target deployment.
 */
test.describe("staging native auth HTTP negatives", () => {
  test.beforeAll(async ({ request }) => {
    const enabledRes = await request.get("/api/auth/native/enabled");
    const body = await enabledRes.json();
    test.skip(!body.enabled, "Native auth disabled on deployment");
  });

  test("rejects unauthenticated sandbox enroll", async ({ request }) => {
    const res = await request.post("/api/sandbox/enroll", {
      headers: { "content-type": "application/json" },
      data: { application_name: "negative test" },
    });
    expect(res.status()).toBeGreaterThanOrEqual(401);
    expect(res.status()).toBeLessThan(500);
  });

  test("rejects passkey register verify without prior challenge", async ({ request }) => {
    const res = await request.post("/api/auth/native/passkey/register/verify", {
      headers: { "content-type": "application/json" },
      data: { credential: { id: "fake", rawId: "fake", response: {}, type: "public-key" } },
    });
    expect([400, 401, 403, 422]).toContain(res.status());
  });

  test("session endpoint reports unauthenticated without cookie", async ({ request }) => {
    const res = await request.get("/api/auth/native/session");
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.authenticated).toBe(false);
  });
});
