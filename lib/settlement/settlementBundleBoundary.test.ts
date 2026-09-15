// FILE: lib/settlement/settlementBundleBoundary.test.ts

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const CLIENT_ROOTS = [
  "components/arc/ArcSettlementDemoClient.tsx",
  "components/partner/launchpad/LaunchpadSettlementPanel.tsx",
];

const FORBIDDEN_IMPORTS = [
  "settlementSigner.server",
  "confirmSettlement.server",
  "SettlementConfirmationVerifier.server",
  "arcRpc.server",
  "walletOwnership.server",
  "ABRAXAS_SETTLEMENT_SIGNER_PRIVATE_KEY",
  "ARC_DEPLOYER_PRIVATE_KEY",
];

describe("settlement bundle boundary", () => {
  for (const relativePath of CLIENT_ROOTS) {
    it(`${relativePath} does not import server signer modules`, () => {
      const source = readFileSync(resolve(process.cwd(), relativePath), "utf8");
      for (const forbidden of FORBIDDEN_IMPORTS) {
        expect(source.includes(forbidden)).toBe(false);
      }
    });
  }

  it("signing module is marked server-only", () => {
    const source = readFileSync(resolve(process.cwd(), "lib/settlement/signing.ts"), "utf8");
    expect(source).toContain('import "server-only"');
  });
});
