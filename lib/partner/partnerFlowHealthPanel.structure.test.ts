// FILE: lib/partner/partnerFlowHealthPanel.structure.test.ts
// Static guards — operator-friendly Partner Flow health panel structure.

import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), "utf8");
}

describe("PartnerFlowHealthPanel operator UX structure", () => {
  it("uses plain-language protection labels in the view model", () => {
    const vm = read("lib/partner/partnerFlowHealthViewModel.ts");
    expect(vm).toContain("Protection active");
    expect(vm).toContain("Basic protection");
    expect(vm).toContain("Network-wide protection not enabled");
    expect(vm).toContain("No activity yet");
  });

  it("collapses technical details by default", () => {
    const panel = read("components/admin/PartnerFlowHealthPanel.tsx");
    expect(panel).toContain('aria-expanded={technicalOpen}');
    expect(panel).toContain("Technical details");
    expect(panel).toContain("{technicalOpen &&");
  });

  it("does not show bash commands outside technical details", () => {
    const page = read("app/admin/partner-flow/page.tsx");
    const panel = read("components/admin/PartnerFlowHealthPanel.tsx");
    expect(page).not.toContain("npm run");
    expect(panel).toContain("technical.cliCommand");
    expect(panel).not.toMatch(/npm run partner-flow:health[\s\S]*Technical details/);
  });

  it("includes next-action card with setup documentation link", () => {
    const panel = read("components/admin/PartnerFlowHealthPanel.tsx");
    const vm = read("lib/partner/partnerFlowHealthViewModel.ts");
    expect(vm).toContain("Enable network-wide protection");
    expect(panel).toContain("nextAction.docUrl");
    expect(panel).toContain("nextAction.docLinkLabel");
  });

  it("delegates presentation logic to partnerFlowHealthViewModel", () => {
    const panel = read("components/admin/PartnerFlowHealthPanel.tsx");
    expect(panel).toContain("partnerFlowHealthViewModel");
    expect(panel).toContain("buildProtectionStatus");
    expect(panel).toContain("buildMetricCards");
  });

  it("explains yellow banner is not a failure", () => {
    const vm = read("lib/partner/partnerFlowHealthViewModel.ts");
    expect(vm).toMatch(/not a failure/i);
    expect(vm).toMatch(/not an outage/i);
  });
});
