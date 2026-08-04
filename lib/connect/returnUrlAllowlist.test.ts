import { beforeEach, describe, expect, it, vi } from "vitest";
import { isReturnUrlAllowed } from "@/lib/connect/returnUrlAllowlist";
import { SITE_URL } from "@/lib/siteUrl";

const GT_ENTER_URL = `${SITE_URL}/good-trouble/enter`;

const partnerRows = new Map<string, { allowed_return_urls: string[] } | null>();

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        eq: (_column: string, partnerId: string) => ({
          maybeSingle: async () => ({ data: partnerRows.get(partnerId) ?? null }),
        }),
      }),
    }),
  }),
}));

describe("isReturnUrlAllowed", () => {
  beforeEach(() => {
    partnerRows.clear();
  });

  it("rejects when partner row is missing", async () => {
    const allowed = await isReturnUrlAllowed(
      "missing-partner",
      "https://partner.example.com/callback",
    );
    expect(allowed).toBe(false);
  });

  it("rejects when allowed_return_urls is empty", async () => {
    partnerRows.set("empty-partner", { allowed_return_urls: [] });
    const allowed = await isReturnUrlAllowed(
      "empty-partner",
      "https://partner.example.com/callback",
    );
    expect(allowed).toBe(false);
  });

  it("allows explicit configured Good Trouble canonical callback", async () => {
    partnerRows.set("good-trouble-cannabis", {
      allowed_return_urls: [GT_ENTER_URL],
    });

    const allowed = await isReturnUrlAllowed("good-trouble-cannabis", GT_ENTER_URL);
    expect(allowed).toBe(true);
  });

  it("allows subpaths under an allowlisted callback prefix", async () => {
    partnerRows.set("good-trouble-cannabis", {
      allowed_return_urls: [GT_ENTER_URL],
    });

    const allowed = await isReturnUrlAllowed(
      "good-trouble-cannabis",
      `${GT_ENTER_URL}/confirmed`,
    );
    expect(allowed).toBe(true);
  });

  it("does not implicitly allow demo preview hosts without configuration", async () => {
    partnerRows.set("unconfigured-demo-partner", { allowed_return_urls: [] });

    const allowed = await isReturnUrlAllowed(
      "unconfigured-demo-partner",
      "https://abraxas-app.vercel.app/demo/partner-access",
    );
    expect(allowed).toBe(false);
  });

  it("rejects non-allowlisted return URLs for configured partners", async () => {
    partnerRows.set("good-trouble-cannabis", {
      allowed_return_urls: [GT_ENTER_URL],
    });

    const allowed = await isReturnUrlAllowed(
      "good-trouble-cannabis",
      "https://evil.example.com/phish",
    );
    expect(allowed).toBe(false);
  });
});
