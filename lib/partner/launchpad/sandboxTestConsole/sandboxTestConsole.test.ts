import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { STARTER_KIT_RUNTIMES } from "@/lib/partner/starterKit/contract";
import {
  buildSandboxTestChecklist,
  launchpadSandboxTestHref,
} from "./contract";
import { buildSandboxTestFixtures, sandboxTestFixtureLeaks } from "./fixtures";
import { buildSandboxTestConsoleView } from "./view";

function targetExists(href: string): boolean {
  const path = href.split("#")[0]?.split("?")[0] ?? href;
  if (path === "/") return existsSync(join(process.cwd(), "app/page.tsx"));
  return existsSync(join(process.cwd(), `app${path}/page.tsx`));
}

const healthyApp = {
  application_id: "app-1",
  status: "active",
  environment: "sandbox",
  policy_version: 1,
  policy_template_id: "age_21_retail",
  allowed_return_urls: ["http://localhost:3000/callback"],
  has_sandbox_key: true,
  webhook_configured: true,
};

describe("sandbox test console", () => {
  it("covers every starter kit platform and keeps fixtures placeholder-only", () => {
    const fixtures = buildSandboxTestFixtures(["webhooks", "trading_venue", "payment_authorization"]);
    expect(fixtures.some((item) => item.id === "callback_request")).toBe(true);
    expect(fixtures.some((item) => item.id === "receipt_approved")).toBe(true);
    expect(fixtures.some((item) => item.id === "receipt_denied")).toBe(true);
    expect(fixtures.some((item) => item.id === "webhook_example")).toBe(true);
    expect(fixtures.some((item) => item.id === "trading_allow")).toBe(true);
    expect(fixtures.some((item) => item.id === "payment_deny")).toBe(true);
    const blob = fixtures.map((item) => item.contents).join("\n");
    for (const runtime of STARTER_KIT_RUNTIMES) {
      expect(blob).toContain(runtime);
    }
    expect(sandboxTestFixtureLeaks(fixtures)).toEqual([]);
    expect(blob).toContain("YOUR_PARTNER_ID");
    expect(blob).not.toMatch(/abx_test_|abx_live_|eyJ/);
  });

  it("filters optional fixtures and checklist items by selected capability", () => {
    const core = buildSandboxTestConsoleView(healthyApp, []);
    expect(core.fixtures.some((item) => item.id === "webhook_example")).toBe(false);
    expect(core.fixtures.some((item) => item.id === "trading_allow")).toBe(false);
    expect(core.checks.find((item) => item.id === "webhooks")?.status).toBe("not_selected");
    const selected = buildSandboxTestConsoleView(healthyApp, ["webhooks", "not_a_cap"]);
    expect(selected.selected_capabilities).toEqual(["webhooks"]);
    expect(selected.fixtures.some((item) => item.id === "webhook_example")).toBe(true);
    expect(selected.checklist.some((item) => item.id === "webhook_verify")).toBe(true);
  });

  it("validates callbacks and never treats client policy as authority", () => {
    const bad = buildSandboxTestConsoleView({
      ...healthyApp,
      allowed_return_urls: ["http://169.254.169.254/callback"],
      policy_template_id: "client-forged-policy",
    }, []);
    expect(bad.checks.find((item) => item.id === "callback")?.status).toBe("action_required");
    expect(JSON.stringify(bad.fixtures)).not.toContain("169.254");
    expect(JSON.stringify(bad.fixtures)).not.toContain("client-forged-policy");
    expect(JSON.stringify(bad.fixtures)).not.toContain("app-1");
  });

  it("links every checklist item to a real page", () => {
    const items = buildSandboxTestChecklist([
      "webhooks",
      "trading_venue",
      "payment_authorization",
      "wallet_standard_binding",
    ]);
    for (const item of items) {
      expect(targetExists(item.href), item.href).toBe(true);
    }
    expect(launchpadSandboxTestHref("app-1")).toBe("/developers/launchpad?app=app-1&view=test");
  });
});
