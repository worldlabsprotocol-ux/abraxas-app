import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signWebhookBody, verifyWebhookSignature } from "@/lib/partner/webhooks/webhookSigning";

const fromMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: vi.fn(() => ({ from: (...args: unknown[]) => fromMock(...args) })),
}));

vi.mock("@/lib/partner/webhooks/webhookEndpointValidation", () => ({
  normalizeWebhookEndpointUrl: (url: URL) => url.toString(),
  validateWebhookEndpointUrl: vi.fn(async (raw: string) => ({
    ok: true,
    url: new URL(raw),
  })),
}));

describe("partner webhook endpoint trust reset", () => {
  const prevMasterKey = process.env.ABRAXAS_WEBHOOK_MASTER_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    fromMock.mockReset();
    process.env.ABRAXAS_WEBHOOK_MASTER_KEY = "test-webhook-master-key";
  });

  afterEach(() => {
    if (prevMasterKey === undefined) delete process.env.ABRAXAS_WEBHOOK_MASTER_KEY;
    else process.env.ABRAXAS_WEBHOOK_MASTER_KEY = prevMasterKey;
  });

  it("disables delivery, rotates secret, and reveals new secret once on endpoint change", async () => {
    const existingRow = {
      partner_id: "partner-a",
      endpoint_url: "https://hooks.old.example/abraxas",
      signing_secret_ciphertext: "old-cipher",
      signing_secret_iv: "old-iv",
      signing_secret_prefix: "abx_whsec_oldprefix",
      enabled: true,
      secret_revealed_at: "2026-01-01T00:00:00.000Z",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      enabled_at: "2026-01-01T00:00:00.000Z",
      last_rotated_at: null,
    };

    let capturedUpdate: Record<string, unknown> | null = null;

    fromMock.mockImplementation((table: string) => {
      if (table === "partners") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { partner_id: "partner-a" } }),
            }),
          }),
        };
      }
      if (table !== "partner_webhook_configs") return {};
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { partner_id: "partner-a" } }),
          }),
        }),
        update: vi.fn((payload: Record<string, unknown>) => {
          capturedUpdate = payload;
          return {
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    ...existingRow,
                    ...payload,
                    endpoint_url: "https://hooks.new.example/abraxas",
                  },
                }),
              }),
            }),
          };
        }),
      };
    });

    const { upsertPartnerWebhookEndpoint } = await import("@/lib/partner/webhooks/webhookConfigService");
    const result = await upsertPartnerWebhookEndpoint({
      partnerId: "partner-a",
      endpointUrl: "https://hooks.new.example/abraxas",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.config.enabled).toBe(false);
    expect(result.signing_secret).toMatch(/^abx_whsec_/);
    expect(result.notice).toContain("re-enable");
    expect(capturedUpdate).toMatchObject({
      endpoint_url: "https://hooks.new.example/abraxas",
      enabled: false,
      enabled_at: null,
    });
    expect(capturedUpdate).not.toBeNull();
    expect(capturedUpdate!.signing_secret_ciphertext).not.toBe("old-cipher");
  });

  it("rejects signatures from the previous secret after endpoint change", async () => {
    const oldSecret = "abx_whsec_old_secret_before_rotation";
    const newSecret = "abx_whsec_new_secret_after_rotation";
    const rawBody = JSON.stringify({
      event_id: "evt-1",
      event_type: "partner.receipt.issued",
      occurred_at: "2026-01-01T00:00:00.000Z",
      partner_id: "partner-a",
    });
    const timestamp = "1704067200";
    const oldSignature = signWebhookBody({ secret: oldSecret, timestamp, rawBody });
    const newSignature = signWebhookBody({ secret: newSecret, timestamp, rawBody });

    expect(verifyWebhookSignature({
      secret: newSecret,
      timestamp,
      rawBody,
      signatureHeader: newSignature,
      nowSec: Number(timestamp),
    }).ok).toBe(true);

    expect(verifyWebhookSignature({
      secret: newSecret,
      timestamp,
      rawBody,
      signatureHeader: oldSignature,
      nowSec: Number(timestamp),
    }).ok).toBe(false);
  });
});
