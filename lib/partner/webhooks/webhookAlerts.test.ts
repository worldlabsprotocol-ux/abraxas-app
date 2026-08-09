import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getPartnerWebhookAlertsStatus,
  isPartnerWebhookAlertsEnabled,
  notifyDispatcherExecutionFailure,
  syncWebhookAlert,
  WEBHOOK_ALERT_COOLDOWN_MS,
} from "@/lib/partner/webhooks/webhookAlerts";

const fromMock = vi.fn();
const rpcMock = vi.fn();
const fetchMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: vi.fn(() => ({
    from: (...args: unknown[]) => fromMock(...args),
    rpc: (...args: unknown[]) => rpcMock(...args),
  })),
}));

function mockClaimSuccess(claimId = "claim-1", kind: "alert" | "recovery" = "alert") {
  rpcMock.mockImplementation((fn: string) => {
    if (fn === "claim_partner_webhook_alert_delivery") {
      return Promise.resolve({
        data: { claimed: true, claim_id: claimId, kind },
        error: null,
      });
    }
    if (fn === "finalize_partner_webhook_alert_delivery") {
      return Promise.resolve({ data: { finalized: true }, error: null });
    }
    return Promise.resolve({ data: null, error: null });
  });
}

function mockClaimRejected(reason: string) {
  rpcMock.mockImplementation((fn: string) => {
    if (fn === "claim_partner_webhook_alert_delivery") {
      return Promise.resolve({
        data: { claimed: false, reason },
        error: null,
      });
    }
    return Promise.resolve({ data: null, error: null });
  });
}

describe("webhook alerts", () => {
  const prev = {
    enabled: process.env.PARTNER_WEBHOOK_ALERTS_ENABLED,
    resend: process.env.RESEND_API_KEY,
    from: process.env.EMAIL_FROM,
    admins: process.env.ABRAXAS_ADMIN_EMAILS,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    fromMock.mockReset();
    rpcMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    process.env.PARTNER_WEBHOOK_ALERTS_ENABLED = "true";
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "ops@example.com";
    process.env.ABRAXAS_ADMIN_EMAILS = "ops@example.com";

    fromMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [] }),
        }),
      }),
    });
  });

  afterEach(() => {
    if (prev.enabled === undefined) delete process.env.PARTNER_WEBHOOK_ALERTS_ENABLED;
    else process.env.PARTNER_WEBHOOK_ALERTS_ENABLED = prev.enabled;
    if (prev.resend === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = prev.resend;
    if (prev.from === undefined) delete process.env.EMAIL_FROM;
    else process.env.EMAIL_FROM = prev.from;
    if (prev.admins === undefined) delete process.env.ABRAXAS_ADMIN_EMAILS;
    else process.env.ABRAXAS_ADMIN_EMAILS = prev.admins;
    vi.unstubAllGlobals();
  });

  it("enables alerts only when PARTNER_WEBHOOK_ALERTS_ENABLED is trimmed true", () => {
    process.env.PARTNER_WEBHOOK_ALERTS_ENABLED = "true";
    expect(isPartnerWebhookAlertsEnabled()).toBe(true);

    process.env.PARTNER_WEBHOOK_ALERTS_ENABLED = " true ";
    expect(isPartnerWebhookAlertsEnabled()).toBe(true);

    process.env.PARTNER_WEBHOOK_ALERTS_ENABLED = "false";
    expect(isPartnerWebhookAlertsEnabled()).toBe(false);

    process.env.PARTNER_WEBHOOK_ALERTS_ENABLED = "TRUE";
    expect(isPartnerWebhookAlertsEnabled()).toBe(false);
  });

  it("reports configured status from server-only env vars", () => {
    const status = getPartnerWebhookAlertsStatus();
    expect(status.configured).toBe(true);
    expect(status.recipient_count).toBe(1);
    expect(status.missing).toEqual([]);
  });

  it("reports missing env vars without exposing secrets", () => {
    delete process.env.RESEND_API_KEY;
    const status = getPartnerWebhookAlertsStatus();
    expect(status.configured).toBe(false);
    expect(status.missing).toContain("RESEND_API_KEY");
    expect(JSON.stringify(status)).not.toContain("re_test");
  });

  it("does not treat legacy ADMIN_EMAIL as an operational alert recipient", async () => {
    delete process.env.ABRAXAS_ADMIN_EMAILS;
    process.env.ADMIN_EMAIL = "legacy@example.com";

    const status = getPartnerWebhookAlertsStatus();
    expect(status.configured).toBe(false);
    expect(status.missing).toContain("ABRAXAS_ADMIN_EMAILS");
    expect(status.recipient_count).toBe(0);

    mockClaimSuccess();
    const result = await syncWebhookAlert({
      alertKey: "excessive_backlog",
      active: true,
      metadata: { pending: 60, retrying: 0, threshold: 50 },
    });

    expect(result).toEqual({ sent: false, kind: "skipped" });
    expect(fetchMock).not.toHaveBeenCalled();

    delete process.env.ADMIN_EMAIL;
  });

  it("sends alert email and finalizes cooldown only after provider success", async () => {
    mockClaimSuccess();

    const result = await syncWebhookAlert({
      alertKey: "excessive_backlog",
      active: true,
      metadata: { pending: 60, retrying: 5, threshold: 50 },
      now: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(result).toEqual({ sent: true, kind: "alert" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith(
      "finalize_partner_webhook_alert_delivery",
      expect.objectContaining({
        p_success: true,
        p_kind: "alert",
        p_cooldown_seconds: Math.floor(WEBHOOK_ALERT_COOLDOWN_MS / 1000),
      }),
    );
  });

  it("skips send when atomic claim rejects cooldown", async () => {
    mockClaimRejected("cooldown");

    const result = await syncWebhookAlert({
      alertKey: "excessive_backlog",
      active: true,
      metadata: { pending: 99 },
      now: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(result).toEqual({ sent: false, kind: "skipped" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(rpcMock).not.toHaveBeenCalledWith(
      "finalize_partner_webhook_alert_delivery",
      expect.objectContaining({ p_success: true }),
    );
  });

  it("releases claim without persisting cooldown when provider send fails", async () => {
    mockClaimSuccess("claim-alert-fail", "alert");
    fetchMock.mockResolvedValue({ ok: false });

    const result = await syncWebhookAlert({
      alertKey: "excessive_backlog",
      active: true,
      metadata: { pending: 60, retrying: 5, threshold: 50 },
      now: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(result).toEqual({ sent: false, kind: "skipped" });
    expect(rpcMock).toHaveBeenCalledWith(
      "finalize_partner_webhook_alert_delivery",
      expect.objectContaining({
        p_claim_id: "claim-alert-fail",
        p_success: false,
      }),
    );
    expect(rpcMock).not.toHaveBeenCalledWith(
      "finalize_partner_webhook_alert_delivery",
      expect.objectContaining({ p_success: true }),
    );
  });

  it("keeps alert active when recovery provider send fails", async () => {
    mockClaimSuccess("claim-recovery-fail", "recovery");
    fetchMock.mockResolvedValue({ ok: false });

    const result = await syncWebhookAlert({
      alertKey: "excessive_backlog",
      active: false,
      metadata: { pending: 0, retrying: 0 },
      now: new Date("2026-01-01T01:00:00.000Z"),
    });

    expect(result).toEqual({ sent: false, kind: "skipped" });
    expect(rpcMock).toHaveBeenCalledWith(
      "finalize_partner_webhook_alert_delivery",
      expect.objectContaining({
        p_claim_id: "claim-recovery-fail",
        p_kind: "recovery",
        p_success: false,
      }),
    );
    expect(rpcMock).not.toHaveBeenCalledWith(
      "finalize_partner_webhook_alert_delivery",
      expect.objectContaining({ p_success: true }),
    );
  });

  it("sends recovery only after provider success", async () => {
    mockClaimSuccess("claim-recovery", "recovery");

    const result = await syncWebhookAlert({
      alertKey: "excessive_backlog",
      active: false,
      metadata: { pending: 0, retrying: 0 },
      now: new Date("2026-01-01T01:00:00.000Z"),
    });

    expect(result).toEqual({ sent: true, kind: "recovery" });
    expect(rpcMock).toHaveBeenCalledWith(
      "finalize_partner_webhook_alert_delivery",
      expect.objectContaining({
        p_claim_id: "claim-recovery",
        p_kind: "recovery",
        p_success: true,
      }),
    );
  });

  it("does not leak raw dispatcher errors into alert email", async () => {
    mockClaimSuccess();

    const leaky = new Error("postgres timeout at https://secret.partner/webhook Authorization: Bearer abc123");
    await notifyDispatcherExecutionFailure(leaky);

    expect(fetchMock).toHaveBeenCalled();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as { html: string; subject: string };
    expect(body.html).toContain("error_category");
    expect(body.html).toContain("error_fingerprint");
    expect(body.html).not.toContain("https://");
    expect(body.html).not.toContain("Bearer");
    expect(body.html).not.toContain("secret.partner");
    expect(body.html).not.toContain("postgres timeout");
    expect(rpcMock).toHaveBeenCalledWith(
      "finalize_partner_webhook_alert_delivery",
      expect.objectContaining({
        p_safe_metadata: expect.objectContaining({
          error_category: "database_error",
        }),
      }),
    );
    const finalizeCall = rpcMock.mock.calls.find(call => call[0] === "finalize_partner_webhook_alert_delivery");
    expect(JSON.stringify(finalizeCall?.[1])).not.toContain("secret.partner");
  });
});

describe("webhook alerts concurrency", () => {
  const prev = {
    enabled: process.env.PARTNER_WEBHOOK_ALERTS_ENABLED,
    resend: process.env.RESEND_API_KEY,
    from: process.env.EMAIL_FROM,
    admins: process.env.ABRAXAS_ADMIN_EMAILS,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    rpcMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    process.env.PARTNER_WEBHOOK_ALERTS_ENABLED = "true";
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "ops@example.com";
    process.env.ABRAXAS_ADMIN_EMAILS = "ops@example.com";
  });

  afterEach(() => {
    if (prev.enabled === undefined) delete process.env.PARTNER_WEBHOOK_ALERTS_ENABLED;
    else process.env.PARTNER_WEBHOOK_ALERTS_ENABLED = prev.enabled;
    if (prev.resend === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = prev.resend;
    if (prev.from === undefined) delete process.env.EMAIL_FROM;
    else process.env.EMAIL_FROM = prev.from;
    if (prev.admins === undefined) delete process.env.ABRAXAS_ADMIN_EMAILS;
    else process.env.ABRAXAS_ADMIN_EMAILS = prev.admins;
    vi.unstubAllGlobals();
  });

  it("allows only one overlapping claim to send email", async () => {
    let claims = 0;
    rpcMock.mockImplementation((fn: string) => {
      if (fn === "claim_partner_webhook_alert_delivery") {
        claims += 1;
        if (claims === 1) {
          return Promise.resolve({
            data: { claimed: true, claim_id: "claim-a", kind: "alert" },
            error: null,
          });
        }
        return Promise.resolve({
          data: { claimed: false, reason: "in_flight" },
          error: null,
        });
      }
      if (fn === "finalize_partner_webhook_alert_delivery") {
        return Promise.resolve({ data: { finalized: true }, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const [first, second] = await Promise.all([
      syncWebhookAlert({
        alertKey: "excessive_backlog",
        active: true,
        metadata: { pending: 60, retrying: 0, threshold: 50 },
      }),
      syncWebhookAlert({
        alertKey: "excessive_backlog",
        active: true,
        metadata: { pending: 60, retrying: 0, threshold: 50 },
      }),
    ]);

    const sentCount = [first, second].filter(result => result.sent).length;
    expect(sentCount).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(claims).toBe(2);
  });
});
