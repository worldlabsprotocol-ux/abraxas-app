import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  buildPartnerFlowTelemetryEvent,
  partnerFlowTelemetryHasNoPii,
  recordPartnerFlowTelemetry,
  resetPartnerFlowTelemetryForTests,
  summarizePartnerFlowTelemetry,
} from "@/lib/partner/partnerFlowTelemetry";

describe("partnerFlowTelemetry", () => {
  beforeEach(() => {
    resetPartnerFlowTelemetryForTests();
  });

  afterEach(() => {
    resetPartnerFlowTelemetryForTests();
  });

  it("classifies rate-limited responses", () => {
    const event = buildPartnerFlowTelemetryEvent({
      endpoint: "/api/v1/partner-flow/evaluate",
      method: "POST",
      httpStatus: 429,
      latencyMs: 12,
      rateLimited: true,
      partnerId: "good-trouble-cannabis",
      policyId: "good-trouble-retail-v1",
    });

    expect(event.outcome).toBe("rate_limited");
    expect(event.rate_limited).toBe(true);
    expect(partnerFlowTelemetryHasNoPii(event)).toBe(true);
  });

  it("strips wallet-like partner identifiers from telemetry", () => {
    const event = buildPartnerFlowTelemetryEvent({
      endpoint: "/api/v1/partner-flow/evaluate",
      method: "POST",
      httpStatus: 200,
      latencyMs: 40,
      partnerId: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      policyId: "policy-ok",
    });

    expect(event.partner_id).toBeNull();
    expect(event.policy_id).toBe("policy-ok");
    expect(partnerFlowTelemetryHasNoPii(event)).toBe(true);
  });

  it("aggregates endpoint outcomes without sensitive payloads", () => {
    recordPartnerFlowTelemetry({
      endpoint: "/api/v1/partner-flow/evaluate",
      method: "POST",
      httpStatus: 200,
      latencyMs: 50,
      partnerId: "pilot-partner",
      policyId: "pilot-policy",
    });
    recordPartnerFlowTelemetry({
      endpoint: "/api/v1/partner-flow/evaluate",
      method: "POST",
      httpStatus: 429,
      latencyMs: 5,
      rateLimited: true,
      partnerId: "pilot-partner",
      policyId: "pilot-policy",
    });
    recordPartnerFlowTelemetry({
      endpoint: "/api/v1/partner-flow/evaluate",
      method: "POST",
      httpStatus: 503,
      latencyMs: 120,
      auditPersistenceFailed: true,
    });

    const snapshot = summarizePartnerFlowTelemetry(
      [
        buildPartnerFlowTelemetryEvent({
          endpoint: "/api/v1/partner-flow/evaluate",
          method: "POST",
          httpStatus: 200,
          latencyMs: 50,
          partnerId: "pilot-partner",
          policyId: "pilot-policy",
        }),
        buildPartnerFlowTelemetryEvent({
          endpoint: "/api/v1/partner-flow/evaluate",
          method: "POST",
          httpStatus: 429,
          latencyMs: 5,
          rateLimited: true,
        }),
        buildPartnerFlowTelemetryEvent({
          endpoint: "/api/v1/partner-flow/evaluate",
          method: "POST",
          httpStatus: 503,
          latencyMs: 120,
          auditPersistenceFailed: true,
        }),
      ],
      24,
    );

    expect(snapshot.total_requests).toBe(3);
    expect(snapshot.rate_limited_total).toBe(1);
    expect(snapshot.audit_persistence_failures).toBe(1);
    expect(snapshot.by_endpoint[0]?.endpoint).toBe("/api/v1/partner-flow/evaluate");
    expect(snapshot.by_endpoint[0]?.partner_ids).toContain("pilot-partner");
  });
});
