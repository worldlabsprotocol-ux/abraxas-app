import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Build 901 beginner surface", () => {
  it("hides integration inspector unless advanced=1 on standalone studio page", () => {
    const page = readFileSync(resolve("app/developers/integration-studio/page.tsx"), "utf8");
    const workspace = readFileSync(resolve("components/developers/IntegrationStudioPageWorkspace.tsx"), "utf8");
    expect(page).not.toContain("IntegrationStudioInspectorRail");
    expect(workspace).toContain('advanced ? <IntegrationStudioInspectorRail /> : undefined');
  });

  it("does not mount inspector on homepage embedded workspace", () => {
    const embedded = readFileSync(resolve("components/developers/EmbeddedIntegrationStudioPanel.tsx"), "utf8");
    expect(embedded).not.toContain("IntegrationStudioInspectorRail");
  });
});
