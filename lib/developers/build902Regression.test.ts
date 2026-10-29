import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Build 902 founder regressions", () => {
  it("Try an example switches in workspace example surface, not legacy studio navigation", () => {
    const journey = readFileSync(resolve("components/developers/ApplicationIntegrationJourneyPanel.tsx"), "utf8");
    expect(journey).toContain('setSurface("example")');
    expect(journey).toContain("BuilderReferenceExampleExperience");
    expect(journey).not.toContain('document.getElementById("builder-example-app")');
    expect(journey).not.toContain("scrollIntoView");
  });

  it("centers beginner journey with shared shell layout classes", () => {
    const css = readFileSync(resolve("app/globals.institutional-workspace.css"), "utf8");
    const workbench = readFileSync(resolve("components/developers/IntegrationStudioRequestWorkbench.tsx"), "utf8");
    expect(css).toContain(".abx-builder-journey-shell");
    expect(css).toContain("justify-content: center");
    expect(css).toContain(".abx-builder-stack-grid");
    expect(workbench).toContain("abx-builder-journey-shell");
  });

  it("reference example probes dedicated health endpoint with CORS", () => {
    const server = readFileSync(resolve("examples/external-node-partner/src/server.ts"), "utf8");
    const probe = readFileSync(resolve("lib/developers/referenceExampleServer.ts"), "utf8");
    expect(server).toContain('url.pathname === "/health"');
    expect(server).toContain("access-control-allow-origin");
    expect(probe).toContain("/health");
  });
});
