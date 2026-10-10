// FILE: lib/partner/universalIntegration/launchpadTenantIsolationRoute.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const sessionMock = vi.fn();
const getAppMock = vi.fn();

vi.mock("@/lib/partner/launchpad/apiHelpers", async () => {
  const actual = await vi.importActual<typeof import("@/lib/partner/launchpad/apiHelpers")>(
    "@/lib/partner/launchpad/apiHelpers",
  );
  return {
    ...actual,
    requireLaunchpadSession: async () => sessionMock(),
  };
});

vi.mock("@/lib/partner/launchpad/resolveLaunchpadApplication", () => ({
  getLaunchpadApplicationForPartner: (...args: unknown[]) => getAppMock(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          in: () => Promise.resolve({ data: [] }),
          order: () => ({ limit: () => Promise.resolve({ data: [] }) }),
          maybeSingle: () => Promise.resolve({ data: null }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/partner/eventDelivery/launchpadWebhook", () => ({
  getLaunchpadWebhookOverview: vi.fn(async () => ({
    webhook_configured: false,
    webhook_enabled: false,
    signing_secret_available: false,
    latest_delivery_status: null,
    delivery_failure_blocker: false,
    extended_event_types_available: false,
    unsupported_lifecycle_events: [],
    schema_skip_code: null,
    production_compatibility: "",
  })),
}));

vi.mock("@/lib/policy/changeControl/schemaReady", () => ({
  probePolicyChangeControlSchema: vi.fn(async () => ({ ready: false })),
}));

import { GET as healthGET } from "@/app/api/launchpad/applications/[id]/health/route";
import { GET as integrationHealthGET } from "@/app/api/launchpad/applications/[id]/integration-health/route";

describe("Launchpad tenant isolation routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionMock.mockResolvedValue({
      ok: true,
      session: { partnerId: "tenant-a" },
    });
  });

  it("health returns 404 when application belongs to another tenant", async () => {
    getAppMock.mockResolvedValue(null);
    const res = await healthGET(
      new NextRequest("http://localhost/api/launchpad/applications/other-app/health"),
      { params: { id: "other-app" } },
    );
    expect(res.status).toBe(404);
    expect(getAppMock).toHaveBeenCalledWith("other-app", "tenant-a");
  });

  it("integration-health returns 404 for cross-tenant application id", async () => {
    getAppMock.mockResolvedValue(null);
    const res = await integrationHealthGET(
      new NextRequest("http://localhost/api/launchpad/applications/other-app/integration-health"),
      { params: { id: "other-app" } },
    );
    expect(res.status).toBe(404);
  });
});
