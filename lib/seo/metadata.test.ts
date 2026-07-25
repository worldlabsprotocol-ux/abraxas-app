// FILE: lib/seo/metadata.test.ts

import { describe, expect, it } from "vitest";
import { SEO_ALL_KEYWORDS, SEO_PRIMARY_KEYWORDS } from "./keywords";
import { pageMetadata } from "./metadata";

describe("seo metadata", () => {
  it("includes all primary keywords in keyword list", () => {
    for (const kw of SEO_PRIMARY_KEYWORDS) {
      expect(SEO_ALL_KEYWORDS).toContain(kw);
    }
  });

  it("pageMetadata sets title, description, and canonical", () => {
    const meta = pageMetadata({
      title: "Test Page",
      description: "Test description for RWA verification.",
      path: "/test",
    });
    expect(meta.title).toBe("Test Page");
    expect(meta.description).toBe("Test description for RWA verification.");
    expect(meta.alternates?.canonical).toContain("/test");
    expect(meta.keywords).toEqual(SEO_ALL_KEYWORDS);
  });
});
