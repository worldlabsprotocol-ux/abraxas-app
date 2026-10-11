import { test, expect } from "@playwright/test";

test.describe("Demo activation API (Build #521)", () => {
  test("local activation-readiness returns schema flags", async ({ request }) => {
    const res = await request.get("/api/demo/activation-readiness");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty("phantom_cielo_path_ready");
    expect(body).toHaveProperty("blocked_reasons");
    expect(Array.isArray(body.blocked_reasons)).toBe(true);
  });

  test("Cielo holder-brief exposes auth_mode", async ({ request }) => {
    const res = await request.get("/api/cielo/verified-rate/holder-brief");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.auth_mode === "solana_native" || body.auth_mode === "legacy_sui").toBe(true);
  });
});
