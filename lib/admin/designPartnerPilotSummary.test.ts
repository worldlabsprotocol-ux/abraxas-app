// FILE: lib/admin/designPartnerPilotSummary.test.ts

import { describe, expect, it } from "vitest";
import {
  applyPilotSummaryCap,
  assertPilotSummaryAllowlist,
  buildDesignPartnerPilotSummary,
  countMainGatesAcknowledged,
  FORBIDDEN_PILOT_SUMMARY_QUERY_TABLES,
  hasInconsistentContinuationSignoff,
  isContinuationPrerequisitesMet,
  MAX_PILOT_SUMMARIES,
  productionEnvironmentActive,
  resolveWebhookConfigured,
} from "@/lib/admin/designPartnerPilotSummary";
import { BOUNDED_PILOT_SUMMARY_QUERY_COUNT } from "@/lib/admin/designPartnerPilotSummaryLoader";
import { defaultSandboxPilotSignoff } from "@/lib/admin/partnerSandboxSignoff";

function basePartnerRow(overrides: Partial<{
  partner_id: string;
  is_external: boolean;
  allowed_environments: string[];
  allowed_return_urls: string[];
  assigned_policy_id: string | null;
  onboarding_checklist: unknown;
}> = {}) {
  return {
    partner_id: "acme-v1",
    is_external: true,
    allowed_environments: ["sandbox"],
    allowed_return_urls: ["https://partner.example.com/callback"],
    assigned_policy_id: "policy-sandbox",
    onboarding_checklist: null,
    ...overrides,
  };
}

function readySummaryInput(signoff = defaultSandboxPilotSignoff("app-1")) {
  return {
    applicationId: "app-1",
    displayName: "Acme Corp",
    promotedPartnerId: "acme-v1",
    partnerRow: basePartnerRow({
      onboarding_checklist: { sandbox_pilot_signoff: signoff },
    }),
    activePolicy: {
      id: "policy-sandbox",
      version: 1,
      status: "active",
      name: "Sandbox",
      partner_id: "acme-v1",
    },
    webhookConfiguredPartnerIds: new Set<string>(),
  };
}

describe("designPartnerPilotSummary phases", () => {
  it("promoted without provisioning ready yields sandbox_provisioning", () => {
    const summary = buildDesignPartnerPilotSummary({
      ...readySummaryInput(),
      partnerRow: basePartnerRow({ allowed_return_urls: [] }),
      activePolicy: null,
    });
    expect(summary.phase).toBe("sandbox_provisioning");
    expect(summary.phase).not.toBe("sandbox_testing");
  });

  it("promoted with provisioning ready and zero gates yields sandbox_testing", () => {
    const summary = buildDesignPartnerPilotSummary(readySummaryInput());
    expect(summary.phase).toBe("sandbox_testing");
  });

  it("promoted with provisioning ready and partial gates yields awaiting_manual_signoff", () => {
    const signoff = defaultSandboxPilotSignoff("app-1");
    signoff.gates.configured.operator_ack = true;
    signoff.gates.configured.acknowledged_at = "2026-01-01T00:00:00.000Z";
    const summary = buildDesignPartnerPilotSummary(readySummaryInput(signoff));
    expect(summary.phase).toBe("awaiting_manual_signoff");
  });

  it("continuation flag alone cannot yield sandbox_continuation_approved", () => {
    const signoff = defaultSandboxPilotSignoff("app-1");
    signoff.gates.approved_for_pilot_continuation.operator_ack = true;
    signoff.gates.approved_for_pilot_continuation.acknowledged_at = "2026-01-01T00:00:00.000Z";
    const summary = buildDesignPartnerPilotSummary(readySummaryInput(signoff));
    expect(summary.phase).not.toBe("sandbox_continuation_approved");
    expect(summary.blocker_codes).toContain("SIGNOFF_STATE_INCONSISTENT");
  });

  it("full prerequisite state can yield sandbox_continuation_approved", () => {
    const signoff = defaultSandboxPilotSignoff("app-1");
    const ack = "2026-01-01T00:00:00.000Z";
    signoff.gates.configured = { operator_ack: true, acknowledged_at: ack };
    signoff.gates.partner_flow_tested = { operator_ack: true, acknowledged_at: ack };
    signoff.gates.partner_verified = {
      operator_ack: true,
      manual_partner_confirmation: true,
      acknowledged_at: ack,
    };
    signoff.gates.approved_for_pilot_continuation = { operator_ack: true, acknowledged_at: ack };
    const summary = buildDesignPartnerPilotSummary(readySummaryInput(signoff));
    expect(summary.phase).toBe("sandbox_continuation_approved");
    expect(isContinuationPrerequisitesMet(signoff, true)).toBe(true);
  });

  it("webhook configured availability does not change phase", () => {
    const summaryAvailable = buildDesignPartnerPilotSummary({
      ...readySummaryInput(),
      webhookConfiguredPartnerIds: new Set(["acme-v1"]),
    });
    const summaryUnavailable = buildDesignPartnerPilotSummary({
      ...readySummaryInput(),
      webhookConfiguredPartnerIds: null,
    });
    expect(summaryAvailable.phase).toBe(summaryUnavailable.phase);
    expect(summaryAvailable.technical.webhook_configured).toEqual({
      availability: "available",
      value: true,
    });
    expect(summaryUnavailable.technical.webhook_configured).toEqual({
      availability: "unavailable",
    });
  });
});

describe("designPartnerPilotSummary cap", () => {
  it("applies 49/50/51 cap semantics", () => {
    expect(applyPilotSummaryCap(Array.from({ length: 49 }, (_, i) => i))).toEqual({
      rows: Array.from({ length: 49 }, (_, i) => i),
      capped: false,
    });
    expect(applyPilotSummaryCap(Array.from({ length: 50 }, (_, i) => i))).toEqual({
      rows: Array.from({ length: 50 }, (_, i) => i),
      capped: false,
    });
    const capped51 = applyPilotSummaryCap(Array.from({ length: 51 }, (_, i) => i));
    expect(capped51.capped).toBe(true);
    expect(capped51.rows).toHaveLength(MAX_PILOT_SUMMARIES);
  });
});

describe("designPartnerPilotSummary allowlist", () => {
  it("accepts bounded DTO fields only", () => {
    const summary = buildDesignPartnerPilotSummary(readySummaryInput());
    expect(() => assertPilotSummaryAllowlist(summary)).not.toThrow();
    expect(summary).not.toHaveProperty("email");
    expect(summary).not.toHaveProperty("onboarding_checklist");
    expect(summary.technical).not.toHaveProperty("api_usage");
    expect(summary.technical).not.toHaveProperty("verification_attempts");
  });

  it("maps provisioning blockers to stable codes without raw strings", () => {
    const summary = buildDesignPartnerPilotSummary({
      ...readySummaryInput(),
      partnerRow: null,
    });
    expect(summary.blocker_codes).toEqual(["PARTNER_ROW_MISSING", "MANUAL_SIGNOFF_INCOMPLETE"]);
    expect(JSON.stringify(summary.blocker_codes)).not.toMatch(/partner_id=|policy_id=|https:\/\//);
  });
});

describe("designPartnerPilotSummary production terminology", () => {
  it("uses production_environment_active as factual state only", () => {
    expect(productionEnvironmentActive(["sandbox"])).toBe(false);
    expect(productionEnvironmentActive(["sandbox", "production"])).toBe(true);
    const summary = buildDesignPartnerPilotSummary(readySummaryInput());
    expect(summary.technical.production_environment_active).toBe(false);
  });
});

describe("designPartnerPilotSummary webhook configured", () => {
  it("returns unavailable when config batch failed, not false", () => {
    expect(resolveWebhookConfigured("acme-v1", null)).toEqual({ availability: "unavailable" });
    expect(resolveWebhookConfigured("acme-v1", new Set())).toEqual({
      availability: "available",
      value: false,
    });
  });
});

describe("bounded pilot summary queries", () => {
  it("documents fixed core query count independent of pilot volume", () => {
    expect(BOUNDED_PILOT_SUMMARY_QUERY_COUNT).toBe(4);
  });
});

describe("forbidden unbounded telemetry tables", () => {
  it("documents tables that must not be queried in v1", () => {
    expect(FORBIDDEN_PILOT_SUMMARY_QUERY_TABLES).toEqual([
      "partner_api_usage",
      "verification_requests",
      "decision_receipts",
      "partner_webhook_outbox",
      "partner_webhook_sandbox_test_receipts",
    ]);
  });
});

describe("continuation helpers", () => {
  it("detects inconsistent continuation without exposing field detail", () => {
    const signoff = defaultSandboxPilotSignoff("app-1");
    signoff.gates.approved_for_pilot_continuation.operator_ack = true;
    expect(hasInconsistentContinuationSignoff(signoff, true)).toBe(true);
    expect(countMainGatesAcknowledged(signoff)).toBe(1);
  });
});