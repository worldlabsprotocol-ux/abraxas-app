import { beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://placeholder.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
});

const maybeSingleMock = vi.hoisted(() => vi.fn());

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: maybeSingleMock,
    })),
  })),
}));

import { validatePartnerKeyIssuance } from "@/lib/partner/validatePartnerKeyIssuance";

describe("validatePartnerKeyIssuance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects live issuance for sandbox-only partners", async () => {
    maybeSingleMock.mockResolvedValue({
      data: {
        company: "Sandbox Ops",
        status: "pilot",
        allowed_environments: ["sandbox"],
      },
    });

    const result = await validatePartnerKeyIssuance("sandbox-partner", "live");

    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
    expect(result.error).toContain("production");
  });

  it("allows test issuance for sandbox-only partners", async () => {
    maybeSingleMock.mockResolvedValue({
      data: {
        company: "Sandbox Ops",
        status: "pilot",
        allowed_environments: ["sandbox"],
      },
    });

    const result = await validatePartnerKeyIssuance("sandbox-partner", "test");

    expect(result.ok).toBe(true);
  });
});
