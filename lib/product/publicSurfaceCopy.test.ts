import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const PUBLIC_FILES = [
  "app/judge-demo/page.tsx",
  "app/layout.tsx",
  "app/docs/circle-arc-testnet/page.tsx",
  "app/docs/page.tsx",
  "app/login/page.tsx",
  "app/passport/page.tsx",
  "app/partner/continue/page.tsx",
  "components/judgeDemo/JudgeDemoSandboxBanner.tsx",
  "components/partner/launchpad/CircleSettlementLaunchpadPanel.tsx",
  "lib/home/simplifiedHomeCopy.ts",
  "lib/docs/docsHub.ts",
  "lib/protocolIntegrations.ts",
];

describe("public surface copy", () => {
  it("does not present a Judge Demo product on public pages", () => {
    for (const rel of PUBLIC_FILES) {
      const src = readFileSync(resolve(__dirname, "../..", rel), "utf8");
      expect(src, rel).not.toMatch(/Public Judge Demo/);
      expect(src, rel).not.toMatch(/Abraxas Judge Demo/);
      expect(src, rel).not.toMatch(/judge-visible/);
    }
  });
});
