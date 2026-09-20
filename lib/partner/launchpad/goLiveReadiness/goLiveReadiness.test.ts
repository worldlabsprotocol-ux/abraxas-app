import { describe, expect, it } from "vitest";
import {
  GO_LIVE_LIFECYCLE_LABEL,
  GO_LIVE_NOTE_MAX_CHARS,
  GO_LIVE_PRODUCTION,
} from "./contract";
import {
  buildGoLiveReadinessView,
  clientOverrideRejected,
  goLiveViewLeaks,
  validateGoLiveNote,
  type GoLiveEvidence,
} from "./evaluate";

function evidence(overrides: Partial<GoLiveEvidence> = {}): GoLiveEvidence {
  return {
    applicationId: "app-1",
    partnerId: "acme",
    status: "active",
    environment: "sandbox",
    policyId: "acme-age_21_retail-v1",
    policyVersion: 1,
    policyTemplateId: "age_21_retail",
    allowedReturnUrls: ["https://partner.example/callback"],
    activeSandboxKey: true,
    webhookConfigured: false,
    webhookEnabled: false,
    latestDeliveryStatus: null,
    verifiedHostnames: ["partner.example"],
    starterKitEvidenced: false,
    starterKitRuntime: null,
    request: null,
    ...overrides,
  };
}

describe("go-live readiness evaluation", () => {
  it("marks ready only from server evidence, not client flags", () => {
    const view = buildGoLiveReadinessView(evidence(), ["trading_venue"]);
    expect(view.lifecycle).toBe("ready_to_request_review");
    expect(view.lifecycle_label).toBe(GO_LIVE_LIFECYCLE_LABEL.ready_to_request_review);
    expect(view.can_request_review).toBe(true);
    expect(view.issues_production_key).toBe(false);
    expect(view.activates_production).toBe(false);
    expect(view.selected_capabilities).toEqual(["hosted_partner_flow", "receipt_verify"]);
    expect(view.checks.find((check) => check.id === "starter_kit")?.status).toBe("not_evidenced");
    expect(view.checks.find((check) => check.id === "trading_venue")?.status).toBe("action_required");
    expect(view.checks.find((check) => check.id === "trading_venue")?.required).toBe(false);
  });

  it("needs setup without a sandbox key or allowlisted callback", () => {
    const view = buildGoLiveReadinessView(evidence({
      activeSandboxKey: false,
      allowedReturnUrls: [],
      verifiedHostnames: [],
    }));
    expect(view.lifecycle).toBe("needs_setup");
    expect(view.can_request_review).toBe(false);
    expect(view.next_steps.map((step) => step.id)).toContain("sandbox_key");
    expect(view.next_steps.map((step) => step.id)).toContain("callback");
  });

  it("shows under review and approved from the existing request row", () => {
    const pending = buildGoLiveReadinessView(evidence({
      request: { id: "req-1", status: "pending", created_at: "2026-01-01T00:00:00Z", reviewed_at: null },
    }));
    expect(pending.lifecycle).toBe("under_review");
    expect(pending.can_request_review).toBe(false);

    const approved = buildGoLiveReadinessView(evidence({
      request: { id: "req-2", status: "approved", created_at: "2026-01-01T00:00:00Z", reviewed_at: "2026-01-02T00:00:00Z" },
    }));
    expect(approved.lifecycle).toBe("approved_for_production");
    expect(approved.can_request_review).toBe(false);
  });

  it("marks starter kit only when activity evidence exists", () => {
    const view = buildGoLiveReadinessView(evidence({
      starterKitEvidenced: true,
      starterKitRuntime: "nextjs",
    }));
    expect(view.checks.find((check) => check.id === "starter_kit")?.status).toBe("pass");
  });

  it("includes webhooks only from server configuration", () => {
    const view = buildGoLiveReadinessView(evidence({ webhookConfigured: true }));
    expect(view.selected_capabilities).toContain("webhooks");
    expect(view.checks.find((check) => check.id === "webhooks")?.status).toBe("pass");
  });

  it("validates short notes and rejects secrets or URLs", () => {
    expect(validateGoLiveNote("Ready for review")).toEqual({ ok: true, note: "Ready for review" });
    expect(validateGoLiveNote("x".repeat(GO_LIVE_NOTE_MAX_CHARS + 1)).ok).toBe(false);
    expect(validateGoLiveNote("abx_live_secretvalue").ok).toBe(false);
    expect(validateGoLiveNote("https://partner.example/callback").ok).toBe(false);
    expect(validateGoLiveNote("wallet 0xabcdeffedcba9876543210").ok).toBe(false);
  });

  it("rejects client override keys and never leaks secrets", () => {
    expect(clientOverrideRejected({ partner_id: "other" })).toBe(true);
    expect(clientOverrideRejected({ partner_note: "hi" })).toBe(false);
    const view = buildGoLiveReadinessView(evidence());
    expect(goLiveViewLeaks(view)).toEqual([]);
    expect(JSON.stringify(view)).not.toMatch(/abx_(test|live)_/);
    expect(JSON.stringify(view)).not.toContain("https://partner.example/callback");
    expect(view.production).toEqual(GO_LIVE_PRODUCTION);
  });
});
