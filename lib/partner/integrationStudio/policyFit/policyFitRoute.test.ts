import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { resetLaunchpadRateLimitStoreForTests } from "@/lib/partner/launchpad/rateLimit";
import { GET, POST } from "@/app/api/developers/integration-studio/policy-fit/route";
import { POLICY_FIT_API_PATH } from "@/lib/partner/integrationStudio/policyFit/contract";
import { studioPublicCatalog } from "@/lib/partner/integrationStudio/catalog";

function post(body: unknown) {
  return new NextRequest(`http://localhost${POLICY_FIT_API_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("policy-fit route", () => {
  beforeEach(() => {
    resetLaunchpadRateLimitStoreForTests();
  });

  it("exposes catalog choices on GET", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json() as { choices: { catalog_version: number; actions: unknown[] } };
    expect(json.choices.actions.length).toBeGreaterThan(0);
    expect(studioPublicCatalog().policy_fit.catalog_version).toBe(json.choices.catalog_version);
  });

  it("returns a fit for a known structured request", async () => {
    const res = await POST(post({
      action: "retail_access",
      category: "age_21",
      environment: "sandbox",
      capabilities: ["reusable_result", "webhook"],
    }));
    expect(res.status).toBe(200);
    const json = await res.json() as { fit: boolean; recommended: { pack_id: string; catalog_version: number } };
    expect(json.fit).toBe(true);
    expect(json.recommended.pack_id).toBe("age_21_retail");
  });

  it("rejects unknown input and extra keys", async () => {
    const unknown = await POST(post({
      action: "retail_access",
      category: "kyc_complete",
      environment: "sandbox",
    }));
    expect(unknown.status).toBe(400);
    const extra = await POST(post({
      action: "retail_access",
      category: "age_21",
      environment: "sandbox",
      policy_version: 2,
    }));
    expect(extra.status).toBe(400);
  });
});
