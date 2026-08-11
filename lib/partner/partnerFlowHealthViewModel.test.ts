import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import type { PartnerFlowHealthReport } from "@/lib/partner/partnerFlowHealth";
import {
  buildActivityEmptyMessage,
  buildMetricCards,
  buildNextActionView,
  buildProtectionStatus,
  buildTechnicalDetails,
  friendlyEndpointName,
  hasPartnerFlowActivity,
  PARTNER_FLOW_RATE_LIMITS_SETUP_URL,
} from "@/lib/partner/partnerFlowHealthViewModel";

function baseReport(overrides?: Partial<PartnerFlowHealthReport>): PartnerFlowHealthReport {
  return {
    window_hours: 24,
    generated_at: new Date().toISOString(),
    sources: { in_memory_telemetry: false, partner_api_usage: false },
    rate_limit: {
      enabled: true,
      backend: "memory",
      hmacSecretConfigured: true,
      trustedIpStrategy: "vercel-x-real-ip",
      distributedStoreRequired: true,
      distributedStoreConfigured: false,
      distributedStoreConfigIncomplete: false,
      distributedStoreActive: false,
      distributedStoreReachable: null,
      distributedStoreErrorCode: null,
      note: "Rate limits use in-process memory only.",
    },
    telemetry: {
      window_hours: 24,
      generated_at: new Date().toISOString(),
      total_requests: 0,
      rate_limited_total: 0,
      error_total: 0,
      audit_persistence_failures: 0,
      by_endpoint: [],
    },
    ...overrides,
  };
}

describe("partnerFlowHealthViewModel", () => {
  it("shows basic per-instance protection when Upstash is not configured", () => {
    const view = buildProtectionStatus(baseReport().rate_limit);
    expect(view.headline).toBe("Basic per-instance protection active");
    expect(view.subheadline).toMatch(/each server instance/i);
    expect(view.showYellowBanner).toBe(true);
    expect(view.yellowBannerTitle).toBe("Network-wide protection not enabled");
  });

  it("shows incomplete configuration when only one Upstash variable is set", () => {
    const view = buildProtectionStatus({
      ...baseReport().rate_limit,
      backend: "distributed_config_incomplete",
      distributedStoreConfigIncomplete: true,
      distributedStoreConfigured: false,
      distributedStoreReachable: false,
      distributedStoreErrorCode: "config_incomplete",
      note: "Upstash Redis configuration is incomplete (only one of UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN is set).",
    });
    expect(view.headline).toBe("Network-wide protection configuration incomplete");
    expect(view.isCritical).toBe(true);
    expect(view.yellowBannerBody).toMatch(/not silently downgraded/i);
    expect(JSON.stringify(view)).not.toContain("super-secret-token");
    expect(JSON.stringify(view)).not.toContain("https://example.upstash.io");
  });

  it("hides next-action when Upstash configuration is incomplete", () => {
    const next = buildNextActionView({
      ...baseReport().rate_limit,
      distributedStoreConfigIncomplete: true,
      backend: "distributed_config_incomplete",
    });
    expect(next.show).toBe(false);
  });

  it("shows network-wide protection when Upstash is active", () => {
    const view = buildProtectionStatus({
      ...baseReport().rate_limit,
      backend: "upstash",
      distributedStoreConfigured: true,
      distributedStoreActive: true,
      distributedStoreReachable: true,
    });
    expect(view.headline).toBe("Network-wide protection active");
    expect(view.subheadline).toMatch(/shared across all Vercel instances/i);
    expect(view.showYellowBanner).toBe(false);
  });

  it("explains yellow state is a configuration warning, not an outage", () => {
    const view = buildProtectionStatus(baseReport().rate_limit);
    expect(view.yellowBannerBody).toMatch(/protection configuration warning/i);
    expect(view.yellowBannerBody).toMatch(/not an outage/i);
    expect(view.yellowBannerBody).toMatch(/each server/i);
  });

  it("shows critical state when HMAC secret is missing", () => {
    const view = buildProtectionStatus({
      ...baseReport().rate_limit,
      hmacSecretConfigured: false,
    });
    expect(view.headline).toBe("Protection incomplete");
    expect(view.isCritical).toBe(true);
    expect(view.showYellowBanner).toBe(false);
  });

  it("shows critical state when Upstash is configured but unreachable", () => {
    const view = buildProtectionStatus({
      ...baseReport().rate_limit,
      backend: "distributed_unavailable",
      distributedStoreConfigured: true,
      distributedStoreActive: false,
      distributedStoreReachable: false,
      distributedStoreErrorCode: "unreachable",
    });
    expect(view.headline).toBe("Network-wide protection unavailable");
    expect(view.isCritical).toBe(true);
    expect(view.yellowBannerBody).toMatch(/not silently downgraded/i);
  });

  it("does not imply Redis is active when only credentials are absent", () => {
    const technical = buildTechnicalDetails(baseReport());
    expect(technical.distributedStoreConfigured).toBe(false);
    expect(technical.distributedStoreActive).toBe(false);
    const view = buildProtectionStatus(baseReport().rate_limit);
    expect(view.headline).toBe("Basic per-instance protection active");
    expect(view.headline).not.toMatch(/Network-wide protection active/i);
  });

  it("does not imply Redis is active when credentials exist but store is not active", () => {
    const view = buildProtectionStatus({
      ...baseReport().rate_limit,
      distributedStoreConfigured: true,
      distributedStoreActive: false,
      distributedStoreReachable: true,
      backend: "memory",
    });
    expect(view.headline).toBe("Basic per-instance protection active");
  });

  it("builds four metric cards with operator descriptions", () => {
    const cards = buildMetricCards({
      window_hours: 24,
      generated_at: new Date().toISOString(),
      total_requests: 12,
      rate_limited_total: 2,
      error_total: 1,
      audit_persistence_failures: 0,
      by_endpoint: [],
    });
    expect(cards).toHaveLength(4);
    expect(cards[0]?.label).toBe("Total requests");
    expect(cards[1]?.label).toBe("Slowed-down requests");
    expect(cards[1]?.description).toMatch(/rate limit/i);
  });

  it("uses No activity yet for empty tables", () => {
    expect(buildActivityEmptyMessage(24)).toBe("No activity yet in the last 24 hours.");
    expect(hasPartnerFlowActivity(baseReport())).toBe(false);
  });

  it("maps endpoints to friendly surface names", () => {
    expect(friendlyEndpointName("/api/v1/partner-flow/evaluate")).toBe("Policy evaluation");
    expect(friendlyEndpointName("/api/receipts/public")).toBe("Public receipt lookup");
  });

  it("shows next-action card when network-wide protection is not enabled", () => {
    const next = buildNextActionView(baseReport().rate_limit);
    expect(next.show).toBe(true);
    expect(next.title).toBe("Enable network-wide protection");
    expect(next.docUrl).toBe(PARTNER_FLOW_RATE_LIMITS_SETUP_URL);
    expect(next.body).toMatch(/basic per-instance protection/i);
  });

  it("hides next-action when network-wide protection is active", () => {
    const next = buildNextActionView({
      ...baseReport().rate_limit,
      distributedStoreActive: true,
      distributedStoreConfigured: true,
      backend: "upstash",
    });
    expect(next.show).toBe(false);
  });

  it("hides next-action when protection is off", () => {
    const next = buildNextActionView({
      ...baseReport().rate_limit,
      enabled: false,
    });
    expect(next.show).toBe(false);
  });

  it("places CLI and env vars in technical details only", () => {
    const technical = buildTechnicalDetails(baseReport());
    expect(technical.cliCommand).toBe("npm run partner-flow:health");
    expect(technical.envVarNames).toContain("UPSTASH_REDIS_REST_URL");
    expect(technical.trustedIpStrategy).toBe("vercel-x-real-ip");
    expect(technical.distributedStoreActive).toBe(false);
  });
});
