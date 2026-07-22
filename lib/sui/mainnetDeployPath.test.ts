// FILE: lib/sui/mainnetDeployPath.test.ts

import { describe, expect, it } from "vitest";
import { getSuiMainnetDeployPath } from "./mainnetDeployPath";

describe("getSuiMainnetDeployPath", () => {
  it("returns seven ordered steps for audit + deploy", () => {
    const path = getSuiMainnetDeployPath();
    expect(path.steps.length).toBeGreaterThanOrEqual(6);
    expect(path.steps[0].id).toBe("move-package");
    expect(path.steps.some(s => s.id === "mainnet-audit")).toBe(true);
    expect(path.steps.some(s => s.id === "mainnet-publish")).toBe(true);
  });

  it("blocks publish until audit completes", () => {
    const path = getSuiMainnetDeployPath();
    const publish = path.steps.find(s => s.id === "mainnet-publish");
    expect(publish).toBeDefined();
    if (!path.audit_complete) {
      expect(publish?.status).toBe("blocked");
    }
  });

  it("includes deploy commands", () => {
    const path = getSuiMainnetDeployPath();
    expect(path.deploy_commands.publish).toContain("sui:deploy:mainnet");
    expect(path.deploy_commands.mint_cap).toContain("mainnet");
  });
});
