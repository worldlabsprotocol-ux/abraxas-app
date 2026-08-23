import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rpcMock = vi.hoisted(() => vi.fn());
const configSelectMock = vi.hoisted(() => vi.fn());
const loadSecretMock = vi.hoisted(() => vi.fn());

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => ({
      select: vi.fn((columns?: string) => {
        if (columns === "enabled") {
          return {
            eq: vi.fn(() => ({
              maybeSingle: configSelectMock,
            })),
          };
        }

        return {
          limit: vi.fn(() => Promise.resolve({ error: null })),
        };
      }),
    })),
    rpc: rpcMock,
  })),
}));

vi.mock("@/lib/partner/webhooks/webhookConfigService", () => ({
  loadPartnerWebhookSigningSecret: (...args: unknown[]) => loadSecretMock(...args),
}));

import {
  getWebhookTestDeliveryReadiness,
  isSandboxPartnerApiKey,
  partnerHasWebhooksReadScope,
  probeWebhookDispatchConfigured,
} from "@/lib/partner/webhooks/webhookOperatorReadiness";

describe("webhookOperatorReadiness", () => {
  const envSnapshot = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://placeholder.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    process.env.ABRAXAS_WEBHOOK_MASTER_KEY = "dedicated-webhook-master-key";
    process.env.PARTNER_WEBHOOK_DISPATCH_SCHEDULER_CONFIGURED = "true";
    process.env.CRON_SECRET = "cron-secret";

    rpcMock.mockResolvedValue({ data: { ok: false, code: "partner_id_required" }, error: null });
    configSelectMock.mockResolvedValue({ data: { enabled: true }, error: null });
    loadSecretMock.mockResolvedValue("whsec_test");
  });

  afterEach(() => {
    process.env = { ...envSnapshot };
  });

  it("identifies sandbox keys and webhooks:read scope", () => {
    expect(isSandboxPartnerApiKey("abx_test_abc")).toBe(true);
    expect(isSandboxPartnerApiKey("abx_live_abc")).toBe(false);
    expect(partnerHasWebhooksReadScope(["webhooks:read"])).toBe(true);
    expect(partnerHasWebhooksReadScope(["verify:credential"])).toBe(false);
  });

  it("reports dispatch configured only from scheduler and cron-secret booleans", () => {
    expect(probeWebhookDispatchConfigured()).toBe(true);

    delete process.env.CRON_SECRET;
    expect(probeWebhookDispatchConfigured()).toBe(false);
  });

  it("derives test_delivery_available from operational booleans only", async () => {
    const result = await getWebhookTestDeliveryReadiness("partner-a");

    expect(result.test_delivery_available).toBe(true);
    expect(result.webhook_dispatch_configured).toBe(true);
    expect(result.webhook_signing_capable).toBe(true);

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("CRON_SECRET");
    expect(serialized).not.toContain("ABRAXAS_WEBHOOK_MASTER_KEY");
    expect(serialized).not.toContain("endpoint");
    expect(serialized).not.toContain("secret");
  });

  it("marks test_delivery_available false when signing is not capable", async () => {
    loadSecretMock.mockResolvedValue(null);

    const result = await getWebhookTestDeliveryReadiness("partner-a");

    expect(result.webhook_signing_capable).toBe(false);
    expect(result.test_delivery_available).toBe(false);
  });
});
