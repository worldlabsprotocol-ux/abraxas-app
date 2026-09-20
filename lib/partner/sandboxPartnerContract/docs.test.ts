import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SANDBOX_PARTNER_CONTRACT_DOCS,
} from "./contract";

describe("sandbox partner contract docs", () => {
  it("publishes the local command and the no-live-holder boundary", () => {
    const page = readFileSync(join(process.cwd(), "app/docs/sandbox-conformance/page.tsx"), "utf8");
    expect(page).toContain("SANDBOX_PARTNER_CONTRACT_COMMAND");
    expect(page).toContain("SANDBOX_PARTNER_CONTRACT_NOTICE");
    expect(page.toLowerCase()).not.toContain("judge");
    const consolePanel = readFileSync(join(process.cwd(), "components/partner/launchpad/PartnerSandboxTestConsolePanel.tsx"), "utf8");
    const studio = readFileSync(join(process.cwd(), "app/developers/integration-studio/IntegrationStudioClient.tsx"), "utf8");
    expect(consolePanel).toContain(SANDBOX_PARTNER_CONTRACT_DOCS);
    expect(studio).toContain(SANDBOX_PARTNER_CONTRACT_DOCS);
  });
});
