import { test, expect } from "@playwright/test";

/**
 * Protected preview runtime probes (Build #541). Requires:
 * LAUNCHPAD_STAGING_URL, VERCEL_PROTECTION_BYPASS, LAUNCHPAD_EXPECTED_SUPABASE_REF
 */
test.describe("Staging runtime probes", () => {
  test("binding and launchpad identity return JSON on preview", async ({ request }) => {
    const base = process.env.LAUNCHPAD_STAGING_URL?.trim();
    const bypass = process.env.VERCEL_PROTECTION_BYPASS?.trim();
    const expectedRef = process.env.LAUNCHPAD_EXPECTED_SUPABASE_REF?.trim();

    if (!base || !bypass || !expectedRef) {
      test.skip(true, "BLOCKED: set LAUNCHPAD_STAGING_URL, VERCEL_PROTECTION_BYPASS, LAUNCHPAD_EXPECTED_SUPABASE_REF");
      return;
    }

    const headers = {
      "x-vercel-protection-bypass": bypass,
      "x-vercel-set-bypass-cookie": "true",
    };

    const binding = await request.get(`${base}/api/preview/supabase-binding`, { headers });
    expect(binding.status(), "supabase-binding must not be HTML 500").toBeLessThan(500);
    expect(binding.headers()["content-type"] ?? "").toContain("application/json");

    if (binding.status() === 200) {
      const body = await binding.json();
      expect(body.production_ref_detected).toBe(false);
      expect(body.url_project_ref).toBe(expectedRef);
    }

    const identity = await request.get(`${base}/api/launchpad/staging/environment`, { headers });
    expect(identity.status(), "staging identity must not be HTML 500").toBeLessThan(500);
    expect(identity.headers()["content-type"] ?? "").toContain("application/json");

    if (identity.status() === 200) {
      const idBody = await identity.json();
      expect(idBody.deployment_environment).toBe("preview");
      expect(idBody.supabase_project_ref).toBe(expectedRef);
    }
  });
});
