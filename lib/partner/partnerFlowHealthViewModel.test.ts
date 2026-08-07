import { describe, expect, it } from "vitest";
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
  it("uses plain-language protection labels for active basic protection", () => {
    const view = buildProtectionStatus(baseReport().rate_limit);
    expect(view.headline).toBe("Protection active");
    expect(view.subheadline).toMatch(/Basic protection/i);
    expect(view.showYellowBanner).toBe(true);
    expect(view.yellowBannerTitle).toBe("Network-wide protection not enabled");
  });

  it("explains yellow state is not a failure", () => {
    const view = buildProtectionStatus(baseReport().rate_limit);
    expect(view.yellowBannerBody).toMatch(/not a failure/i);
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

  it("keeps yellow banner when Redis env vars are set but not wired", () => {
    const view = buildProtectionStatus({
      ...baseReport().rate_limit,
      distributedStoreConfigured: true,
      note: "Upstash env vars are set but distributed rate limiting is not wired yet.",
    });
    expect(view.showYellowBanner).toBe(true);
    expect(view.yellowBannerBody).toMatch(/not wired yet/i);
    expect(view.yellowBannerBody).toMatch(/not an outage/i);
  });

  it("does not imply Redis is enabled when credentials are absent", () => {
    const technical = buildTechnicalDetails(baseReport());
    expect(technical.distributedStoreConfigured).toBe(false);
    const view = buildProtectionStatus(baseReport().rate_limit);
    expect(view.yellowBannerTitle).toBe("Network-wide protection not enabled");
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
    expect(next.body).toMatch(/each server individually/i);
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
  });
});
