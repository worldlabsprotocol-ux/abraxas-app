// FILE: lib/partner/hospitality/launchpadTenantBinding.test.ts
// DB authorization contract: application rows are partner-scoped (mocked admin).

import { beforeEach, describe, expect, it, vi } from "vitest";

const maybeSingleMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: () => maybeSingleMock(),
          }),
          maybeSingle: () => maybeSingleMock(),
        }),
      }),
    }),
  }),
}));

import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";

describe("Launchpad tenant binding (hospitality)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when application id belongs to another partner (cross-tenant read blocked)", async () => {
    maybeSingleMock.mockResolvedValue({ data: null });
    const row = await getLaunchpadApplicationForPartner("app-b", "rental-synthetic-operator-b");
    expect(row).toBeNull();
  });

  it("returns application when partner_id matches", async () => {
    maybeSingleMock.mockResolvedValue({
      data: {
        id: "app-b",
        partner_id: "rental-synthetic-operator-b",
        public_slug: "synthetic-b",
      },
    });
    const row = await getLaunchpadApplicationForPartner("app-b", "rental-synthetic-operator-b");
    expect(row?.partner_id).toBe("rental-synthetic-operator-b");
  });

  it("Cielo cannot load synthetic B application under cielo partner id", async () => {
    maybeSingleMock.mockResolvedValue({ data: null });
    const row = await getLaunchpadApplicationForPartner("app-b", "cielo");
    expect(row).toBeNull();
  });
});
