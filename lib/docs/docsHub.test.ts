// FILE: lib/docs/docsHub.test.ts

import { describe, expect, it } from "vitest";
import { DOCS_HUB_GROUPS, DOCS_HUB_NAV, getDocsHubGroup } from "./docsHub";

describe("docsHub", () => {
  it("exposes top-level nav in requested order", () => {
    expect(DOCS_HUB_NAV.map((n) => n.id)).toEqual([
      "overview",
      "quick-start",
      "core-concepts",
      "developer",
      "roadmap",
    ]);
  });

  it("includes four core concept topics", () => {
    const core = getDocsHubGroup("core-concepts");
    expect(core?.topics.map((t) => t.id)).toEqual([
      "passport",
      "biometrics",
      "trust-registry",
      "assets",
    ]);
  });

  it("includes developer docs topics", () => {
    const dev = getDocsHubGroup("developer");
    expect(dev?.topics.map((t) => t.id)).toEqual(["api", "architecture", "security"]);
  });

  it("links roadmap to integration readiness and partner flow", () => {
    const roadmap = getDocsHubGroup("roadmap");
    const hrefs = roadmap?.topics[0]?.links?.map((l) => l.href) ?? [];
    expect(hrefs).toContain("/docs/integration-readiness");
    expect(hrefs).toContain("/docs/partner-flow");
  });

  it("keeps summaries short for scanability", () => {
    for (const group of DOCS_HUB_GROUPS) {
      for (const topic of group.topics) {
        expect(topic.summary.length).toBeLessThan(320);
      }
    }
  });
});
