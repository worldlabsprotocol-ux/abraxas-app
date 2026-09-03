// FILE: lib/home/simplifiedHomeCopy.test.ts

import { describe, expect, it } from "vitest";
import {
  SIMPLIFIED_HOME_FORBIDDEN_TERMS,
  SIMPLIFIED_HOME_HEADLINE,
  SIMPLIFIED_HOME_SUBHEAD,
  SIMPLIFIED_HOW_IT_WORKS,
  SIMPLIFIED_TRUST_STATEMENT,
} from "./simplifiedHomeCopy";

describe("simplified homepage copy", () => {
  it("avoids forbidden marketing terms in primary copy", () => {
    const corpus = [
      SIMPLIFIED_HOME_HEADLINE,
      SIMPLIFIED_HOME_SUBHEAD,
      SIMPLIFIED_TRUST_STATEMENT,
      ...SIMPLIFIED_HOW_IT_WORKS.map((step) => `${step.title} ${step.body}`),
    ].join(" ").toLowerCase();

    for (const term of SIMPLIFIED_HOME_FORBIDDEN_TERMS) {
      expect(corpus).not.toContain(term);
    }
  });

  it("keeps headings concise", () => {
    const words = SIMPLIFIED_HOME_HEADLINE.split(/\s+/).length;
    expect(words).toBeLessThanOrEqual(8);
  });
});
