// FILE: lib/product/uiAuditMatrix.test.ts

import { describe, expect, it } from "vitest";
import { routesForAudience, routesMarked, UI_AUDIT_MATRIX } from "./uiAuditMatrix";

describe("uiAuditMatrix", () => {
  it("covers holder, partner, operator, and public surfaces", () => {
    expect(routesForAudience("holder").length).toBeGreaterThan(0);
    expect(routesForAudience("partner").length).toBeGreaterThan(0);
    expect(routesForAudience("operator").length).toBeGreaterThan(0);
    expect(routesForAudience("public").length).toBeGreaterThan(0);
  });

  it("marks homepage and admin value evidence for redesign", () => {
    expect(routesMarked("redesign")).toContain("/");
    expect(routesMarked("redesign")).toContain("/admin/value-evidence");
  });

  it("requires desired messaging for reusable private eligibility", () => {
    const home = UI_AUDIT_MATRIX.find((e) => e.route === "/");
    expect(home?.desired_message.toLowerCase()).toContain("reusable");
    expect(home?.desired_message.toLowerCase()).toContain("eligibility");
  });
});
