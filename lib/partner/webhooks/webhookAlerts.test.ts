import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getPartnerWebhookAlertsStatus,
  isPartnerWebhookAlertsEnabled,
  syncWebhookAlert,
  WEBHOOK_ALERT_COOLDOWN_MS,
} from "@/lib/partner/webhooks/webhookAlerts";

const fromMock = vi.fn();
const fetchMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: vi.fn(() => ({ from: (...args: unknown[]) => fromMock(...args) })),
}));

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

  it("sends alert email and persists cooldown state", async () => {
    const upsertMock = vi.fn().mockResolvedValue({});
    fromMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
      upsert: upsertMock,
    });

    const result = await syncWebhookAlert({
      alertKey: "excessive_backlog",
      active: true,
      metadata: { pending: 60, retrying: 5, threshold: 50 },
      now: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(result.kind).toBe("alert");
    expect(fetchMock).toHaveBeenCalled();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as { subject: string; html: string; to: string[] };
    expect(body.to).toEqual(["ops@example.com"]);
    expect(body.subject).toContain("backlog");
    expect(body.html).toContain("pending");
    expect(body.html).not.toContain("https://");
    expect(upsertMock).toHaveBeenCalledWith(expect.objectContaining({
      alert_key: "excessive_backlog",
      is_active: true,
      cooldown_until: new Date(Date.parse("2026-01-01T00:00:00.000Z") + WEBHOOK_ALERT_COOLDOWN_MS).toISOString(),
    }), expect.any(Object));
  });

  it("skips resend while cooldown is active", async () => {
    fromMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              alert_key: "excessive_backlog",
              is_active: true,
              cooldown_until: "2099-01-01T00:00:00.000Z",
            },
          }),
        }),
      }),
      upsert: vi.fn(),
    });

    const result = await syncWebhookAlert({
      alertKey: "excessive_backlog",
      active: true,
      metadata: { pending: 99 },
      now: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(result.kind).toBe("skipped");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends recovery when condition clears", async () => {
    const upsertMock = vi.fn().mockResolvedValue({});
    fromMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              alert_key: "excessive_backlog",
              is_active: true,
              last_sent_at: "2026-01-01T00:00:00.000Z",
              cooldown_until: null,
            },
          }),
        }),
      }),
      upsert: upsertMock,
    });

    const result = await syncWebhookAlert({
      alertKey: "excessive_backlog",
      active: false,
      metadata: { pending: 0, retrying: 0 },
      now: new Date("2026-01-01T01:00:00.000Z"),
    });

    expect(result.kind).toBe("recovery");
    expect(fetchMock).toHaveBeenCalled();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as { subject: string };
    expect(body.subject).toContain("recovered");
    expect(upsertMock).toHaveBeenCalledWith(expect.objectContaining({
      is_active: false,
      cooldown_until: null,
    }), expect.any(Object));
  });
});
