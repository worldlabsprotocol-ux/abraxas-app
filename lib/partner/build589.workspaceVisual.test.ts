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
});
