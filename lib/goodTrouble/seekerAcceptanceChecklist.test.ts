// FILE: lib/goodTrouble/seekerAcceptanceChecklist.test.ts

import { describe, expect, it } from "vitest";
import {
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_ID,
  GOOD_TROUBLE_CANONICAL_RESULT_FAMILY,
} from "@/lib/goodTrouble/canonicalProductionConfig";
import {
  buildSeekerAcceptanceChecklist,
  buildSeekerAcceptanceContext,
  seekerChecklistSummary,
  SEEKER_ACCEPTANCE_SECTION_IDS,
} from "@/lib/goodTrouble/seekerAcceptanceChecklist";

describe("seekerAcceptanceChecklist", () => {
  it("defines canonical production context for Seeker", () => {
    const ctx = buildSeekerAcceptanceContext();
    expect(ctx.device).toBe("solana_seeker");
    expect(ctx.appId).toBe("xyz.abraxasworld.app");
    expect(ctx.partnerId).toBe(GOOD_TROUBLE_CANONICAL_PARTNER_ID);
    expect(ctx.policyId).toBe(GOOD_TROUBLE_CANONICAL_POLICY_ID);
    expect(ctx.resultFamily).toBe(GOOD_TROUBLE_CANONICAL_RESULT_FAMILY);
    expect(ctx.idvRequired).toBe(false);
    expect(ctx.handoffTtlMinutes).toBe(15);
  });

  it("covers all acceptance sections with unique check ids", () => {
    const checks = buildSeekerAcceptanceChecklist();
    const sections = new Set(checks.map((c) => c.section));
    for (const section of SEEKER_ACCEPTANCE_SECTION_IDS) {
      expect(sections.has(section)).toBe(true);
    }
    const ids = checks.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(checks.length).toBeGreaterThanOrEqual(10);
  });

  it("starts all checks pending until operator records device results", () => {
    const checks = buildSeekerAcceptanceChecklist();
    expect(checks.every((c) => c.status === "pending")).toBe(true);
    const summary = seekerChecklistSummary(checks);
    expect(summary.complete).toBe(false);
    expect(summary.pending).toBe(checks.length);
  });

  it("marks checklist complete only when all checks pass", () => {
    const checks = buildSeekerAcceptanceChecklist().map((c) => ({ ...c, status: "pass" as const }));
    expect(seekerChecklistSummary(checks).complete).toBe(true);
  });
});
