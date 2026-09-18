import { describe, expect, it } from "vitest";
import { buildLaunchpadIntegrationHealth } from "./integrationHealth";
import { REQUIRED_HARNESS_SCENARIOS } from "./partnerTestHarness";
import type { LaunchpadApplicationRow } from "./types";

const app = {
  id: "app", public_slug: "partner-app", partner_id: "partner", application_name: "App", display_name: "App",
  environment: "sandbox", policy_id: "policy-v1", policy_version: 1, policy_template_id: "age_21_retail",
  allowed_return_urls: ["http://localhost:3000/callback"], api_key_id: "key", production_api_key_id: null,
  production_key_revealed_at: null, status: "active", idempotency_key: null, created_at: "2026-01-01", updated_at: "2026-01-01",
} satisfies LaunchpadApplicationRow;

describe("Launchpad integration health", () => {
  it("keeps production blocked until the callback and its domain are proven", () => {
    const health = buildLaunchpadIntegrationHealth({
      application: app,
      activeSandboxKey: true,
      activeProductionKey: false,
      verifiedHostnames: [],
      harnessCompleted: REQUIRED_HARNESS_SCENARIOS,
    });
    expect(health.overall).toBe("blocked");
    expect(health.checks.find((check) => check.id === "production")?.status).toBe("blocked");
  });

  it("blocks activation until the test harness passes", () => {
    const health = buildLaunchpadIntegrationHealth({
      application: { ...app, allowed_return_urls: ["https://partner.example.com/callback"] },
      activeSandboxKey: true,
      activeProductionKey: false,
      verifiedHostnames: ["partner.example.com"],
    });
    expect(health.checks.find((check) => check.id === "harness")?.status).toBe("action_required");
    expect(health.checks.find((check) => check.id === "production")?.detail).toContain("integration test harness");
  });

  it("makes an eligible integration actionable before automatic activation", () => {
    const health = buildLaunchpadIntegrationHealth({
      application: { ...app, allowed_return_urls: ["https://partner.example.com/callback"] },
      activeSandboxKey: true,
      activeProductionKey: false,
      verifiedHostnames: ["partner.example.com"],
      harnessCompleted: REQUIRED_HARNESS_SCENARIOS,
    });
    expect(health.overall).toBe("action_required");
    expect(health.checks.find((check) => check.id === "production")?.detail).toContain("All automated safety checks passed");
    expect(health.checks.find((check) => check.id === "policy_pack")?.detail).toContain("Age 21");
    expect(health.checks.find((check) => check.id === "webhook")?.status).toBe("action_required");
    expect(health.checks.find((check) => check.id === "webhook_schema")?.status).toBe("action_required");
    expect(health.checks.find((check) => check.id === "webhook_schema")?.detail).toContain("event_type_not_supported");
    expect(health.checks.find((check) => check.id === "webhook_schema")?.detail).toContain("TEST EVENT");
  });

  it("keeps collector redemption sandbox-only even after the harness passes", () => {
    const health = buildLaunchpadIntegrationHealth({
      application: {
        ...app,
        policy_template_id: "collector_redemption",
        allowed_return_urls: ["https://partner.example.com/callback"],
      },
      activeSandboxKey: true,
      activeProductionKey: false,
      verifiedHostnames: ["partner.example.com"],
      harnessCompleted: REQUIRED_HARNESS_SCENARIOS,
    });
    expect(health.checks.find((check) => check.id === "production")?.status).toBe("blocked");
    expect(health.checks.find((check) => check.id === "production")?.detail).toContain("sandbox-only");
  });

  it("surfaces policy version pin health when catalog and pin diverge", () => {
    const health = buildLaunchpadIntegrationHealth({
      application: app,
      activeSandboxKey: true,
      activeProductionKey: false,
      verifiedHostnames: [],
      policyChangeControl: {
        status: "action_required",
        nextAction: "Explicitly adopt published policy version 2.",
        blockerCode: "policy_version_not_adopted",
        pinnedVersion: 1,
        activeVersion: 2,
      },
    });
    const check = health.checks.find((item) => item.id === "policy_change_control");
    expect(check?.status).toBe("action_required");
    expect(check?.detail).toContain("policy_version_not_adopted");
    expect(check?.detail).toContain("Pinned v1");
  });

  it("blocks overall health when Policy Change Control schema is unavailable", () => {
    const health = buildLaunchpadIntegrationHealth({
      application: { ...app, environment: "production", production_api_key_id: "live", allowed_return_urls: ["https://partner.example.com/callback"] },
      activeSandboxKey: true,
      activeProductionKey: true,
      verifiedHostnames: ["partner.example.com"],
      harnessCompleted: REQUIRED_HARNESS_SCENARIOS,
      webhookConfigured: true,
      webhookEnabled: true,
      signingSecretAvailable: true,
      latestDeliveryStatus: "delivered",
      deliveryFailureBlocker: false,
      extendedEventTypesAvailable: true,
      policyChangeControl: {
        status: "blocked",
        nextAction: "Policy Change Control schema is unavailable. Lifecycle reads and writes are blocked.",
        blockerCode: "policy_schema_unavailable",
        pinnedVersion: 1,
        activeVersion: null,
      },
    });
    expect(health.overall).toBe("blocked");
    const check = health.checks.find((item) => item.id === "policy_change_control");
    expect(check?.status).toBe("blocked");
    expect(check?.detail).toContain("policy_schema_unavailable");
  });

  it("reports fully active production only with a live scoped key", () => {
    const health = buildLaunchpadIntegrationHealth({
      application: { ...app, environment: "production", production_api_key_id: "live", allowed_return_urls: ["https://partner.example.com/callback"] },
      activeSandboxKey: true,
      activeProductionKey: true,
      verifiedHostnames: ["partner.example.com"],
      harnessCompleted: REQUIRED_HARNESS_SCENARIOS,
      webhookConfigured: true,
      webhookEnabled: true,
      signingSecretAvailable: true,
      latestDeliveryStatus: "delivered",
      deliveryFailureBlocker: false,
      extendedEventTypesAvailable: true,
    });
    expect(health.overall).toBe("pass");
    expect(health.checks.find((check) => check.id === "production")?.status).toBe("pass");
  });
});
