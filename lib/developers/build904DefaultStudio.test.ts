import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Build 904 default studio beginner gate", () => {
  it("routes standalone studio through beginner flow unless advanced=1", () => {
    const client = readFileSync(resolve("app/developers/integration-studio/IntegrationStudioClient.tsx"), "utf8");
    expect(client).toContain("IntegrationStudioBeginnerFlow");
    expect(client).toContain("standaloneStudioPath && !advancedStudio");
    expect(client).toContain("if (beginnerSurface) {");
  });

  it("hides lifecycle guide and inspector on beginner workspace shell", () => {
    const workspace = readFileSync(resolve("components/developers/IntegrationStudioWorkspace.tsx"), "utf8");
    expect(workspace).toContain("!beginnerSurface");
    expect(workspace).toContain("!embeddedInDeveloperWorkspace && !beginnerSurface");
  });

  it("uses Suspense wrapped public page for search param beginner mode", () => {
    const page = readFileSync(resolve("components/developers/IntegrationStudioPublicPage.tsx"), "utf8");
    expect(page).toContain("Suspense");
    expect(page).toContain('get("advanced") === "1"');
  });
});
