// FILE: lib/rwaTokenizationThesis.test.ts

import { describe, expect, it } from "vitest";
import {
  RWA_THESIS_MEDIUM_URL,
  RWA_THESIS_SLUG,
  RWA_THESIS_ACTS,
  RWA_THESIS_SLIDES,
  RWA_TOKENIZATION_STEPS,
} from "./rwaTokenizationThesis";
import { getBlogArticle, getFeaturedThesisArticle } from "./content/blogArticles";

describe("rwaTokenizationThesis", () => {
  it("links to Medium original", () => {
    expect(RWA_THESIS_MEDIUM_URL).toContain("medium.com/@worldlabsprotocol");
  });

  it("defines four thesis acts for homepage demo", () => {
    expect(RWA_THESIS_ACTS).toHaveLength(4);
  });

  it("lists seven tokenization steps", () => {
    expect(RWA_TOKENIZATION_STEPS).toHaveLength(7);
  });

  it("defines six homepage slideshow slides", () => {
    expect(RWA_THESIS_SLIDES).toHaveLength(6);
    expect(RWA_THESIS_SLIDES[0].visual).toBe("market");
    expect(RWA_THESIS_SLIDES[5].visual).toBe("abraxas");
  });

  it("has matching featured blog article", () => {
    expect(RWA_THESIS_SLUG).toBe("what-is-real-world-asset-tokenization");
    const article = getBlogArticle(RWA_THESIS_SLUG);
    expect(article?.mediumUrl).toBe(RWA_THESIS_MEDIUM_URL);
    expect(getFeaturedThesisArticle()?.slug).toBe(RWA_THESIS_SLUG);
  });
});
