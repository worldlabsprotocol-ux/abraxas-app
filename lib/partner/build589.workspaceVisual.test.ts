// FILE: lib/partner/build589.workspaceVisual.test.ts

import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

describe("Build #589 institutional workspace presentation", () => {
  it("wraps Integration Studio and Launchpad in shared institutional shell", () => {
    const studio = readFileSync(
      resolve(process.cwd(), "components/developers/IntegrationStudioWorkspace.tsx"),
      "utf8",
    );
    const launchpad = readFileSync(
      resolve(process.cwd(), "components/partner/launchpad/PartnerLaunchpadClient.tsx"),
      "utf8",
    );
    expect(studio).toContain("AbxInstitutionalWorkspaceShell");
    expect(launchpad).toContain("AbxInstitutionalWorkspaceShell");
  });

  it("ships institutional workspace styles", () => {
    const css = readFileSync(resolve(process.cwd(), "app/globals.institutional-workspace.css"), "utf8");
    expect(css).toContain(".abx-inst-workspace-shell");
    expect(css).toContain("prefers-reduced-motion");
  });

  it("assigns canvas and inspector to distinct grid areas on desktop", () => {
    const css = readFileSync(resolve(process.cwd(), "app/globals.institutional-workspace.css"), "utf8");
    expect(css).toContain('grid-template-areas:');
    expect(css).toContain('"canvas inspector"');
    expect(css).toContain("grid-area: canvas");
    expect(css).toContain("grid-area: inspector");
  });

  it("keeps lifecycle diagram out of Integration Studio primary canvas", () => {
    const client = readFileSync(
      resolve(process.cwd(), "app/developers/integration-studio/IntegrationStudioClient.tsx"),
      "utf8",
    );
    expect(client).not.toContain("PartnerLifecycleControlRoomVisual");
    expect(client).toContain("IntegrationStudioOperationalBridge");
    expect(client).toContain("operationsRail={operationsRail}");
  });

  it("uses Integration inspector heading without fabricated live claims", () => {
    const inspector = readFileSync(
      resolve(process.cwd(), "components/developers/IntegrationStudioInspectorRail.tsx"),
      "utf8",
    );
    expect(inspector).toContain("Integration inspector");
    expect(inspector).not.toContain("Live integration instrument");
    expect(inspector).toContain("resolveIntegrationInspectorLoadState");
  });
});
