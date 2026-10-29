import { describe, expect, it } from "vitest";
import { isValidLaunchpadPublicSlug, resolveLaunchpadPublicSlug } from "@/lib/partner/launchpad/slug";

describe("resolveLaunchpadPublicSlug", () => {
  it("keeps unique slugs per anonymous studio tenant for common names", () => {
    const a = resolveLaunchpadPublicSlug("test", "studio-test-1234567890ab");
    const b = resolveLaunchpadPublicSlug("test", "studio-test-fedcba098765");
    expect(isValidLaunchpadPublicSlug(a)).toBe(true);
    expect(isValidLaunchpadPublicSlug(b)).toBe(true);
    expect(a).not.toBe(b);
    expect(a).toContain("test");
  });

  it("accepts signed-in partner ids", () => {
    const slug = resolveLaunchpadPublicSlug("Retail App", "acme-corp");
    expect(isValidLaunchpadPublicSlug(slug)).toBe(true);
    expect(slug.startsWith("retail-app")).toBe(true);
  });
});
