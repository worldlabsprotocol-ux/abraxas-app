import { describe, expect, it } from "vitest";
import {
  CANONICAL_PRODUCTION_ORIGIN,
  HOW_TO_INTEGRATE_STEPS,
  INTEGRATION_READINESS_DOC,
  INTEGRATION_STATUS_SECTIONS,
  INTEGRATION_WIRING_CHECKLIST,
  INTEGRATION_WIRING_COMPLETE_CRITERIA,
  PARTNER_INTEGRATION_PATHS,
  RELEASE_GATE_CHECKLIST,
  isLiveIntegrationPhase,
} from "./integrationReadiness";

describe("integrationReadiness", () => {
  it("documents reconciliation at a stable path", () => {
    expect(INTEGRATION_READINESS_DOC).toBe("docs/INTEGRATION_READINESS_RECONCILIATION.md");
  });

  it("uses four evidence-based status buckets", () => {
    expect(INTEGRATION_STATUS_SECTIONS.map(s => s.id)).toEqual([
      "live",
      "beta_ready",
      "blocked",
      "later",
    ]);
  });

  it("lists merged P1-2, P1-3, preflight, and security package as live", () => {
    const live = INTEGRATION_STATUS_SECTIONS.find(s => s.id === "live")!.items.join(" ");
    expect(live).toContain("P1-2");
    expect(live).toContain("P1-3");
    expect(live).toContain("integration:preflight");
    expect(live).toContain("security-review readiness");
    expect(live).toContain("OpenAPI");
  });

  it("does not mark IAT, external review, or beta tag as complete", () => {
    const blocked = INTEGRATION_STATUS_SECTIONS.find(s => s.id === "blocked")!.items.join(" ");
    expect(blocked).toContain("IAT");
    expect(blocked).toContain("NOT complete");
    expect(blocked).toContain("v1.0.0-beta.0");
    expect(blocked).toContain("security review");
  });

  it("describes Good Trouble as pilot/sandbox pending evidence", () => {
    const beta = INTEGRATION_STATUS_SECTIONS.find(s => s.id === "beta_ready")!.items.join(" ");
    expect(beta.toLowerCase()).toContain("pilot");
    expect(beta.toLowerCase()).toContain("sandbox");
  });

  it("links how-to-integrate paths for partner-flow docs and OpenAPI", () => {
    expect(PARTNER_INTEGRATION_PATHS.integratorGuide).toBe("/docs/partner-flow");
    expect(PARTNER_INTEGRATION_PATHS.openApiDocs).toBe("/docs/partner-flow-api");
    expect(PARTNER_INTEGRATION_PATHS.openApiYaml).toBe("/openapi/partner-flow.openapi.yaml");
    expect(HOW_TO_INTEGRATE_STEPS).toHaveLength(4);
    expect(HOW_TO_INTEGRATE_STEPS.map(s => s.href)).toContain("/docs/partner-flow");
    expect(HOW_TO_INTEGRATE_STEPS.map(s => s.href)).toContain("/openapi/partner-flow.openapi.yaml");
  });

  it("uses canonical production origin", () => {
    expect(CANONICAL_PRODUCTION_ORIGIN).toBe("https://abraxasworld.xyz");
  });

  it("separates wiring checklist from release gates", () => {
    expect(INTEGRATION_WIRING_CHECKLIST.length).toBeGreaterThanOrEqual(8);
    expect(RELEASE_GATE_CHECKLIST.every(g => g.blocked)).toBe(true);
    expect(INTEGRATION_WIRING_COMPLETE_CRITERIA.length).toBeGreaterThanOrEqual(4);
  });

  it("identifies live phase for roadmap checkmarks", () => {
    expect(isLiveIntegrationPhase("Live today")).toBe(true);
    expect(isLiveIntegrationPhase("Release gates — pending / blocked")).toBe(false);
  });
});
