import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { INVESTOR_PROOF_MAP } from "./investorProofMap";
import { publicHomeFlowById } from "@/lib/product/publicFlowManifest";
import { getNetworkCapability } from "@/lib/partner/networkCapability";

describe("investor proof map", () => {
  it("keeps sandbox and planned examples aligned with the public flow manifest", () => {
    expect(INVESTOR_PROOF_MAP.find((item) => item.id === "good-trouble")?.status).toBe(
      publicHomeFlowById("good-trouble")?.status,
    );
    expect(INVESTOR_PROOF_MAP.find((item) => item.id === "cielo")?.status).toBe(
      publicHomeFlowById("cielo-registry")?.status,
    );
  });

  it("does not equate configured network adapters with deployed gates", () => {
    expect(getNetworkCapability("solana_devnet")?.status).toBe("configured");
    expect(getNetworkCapability("evm_sepolia")?.status).toBe("configured");
    for (const id of ["solana", "evm"]) {
      const item = INVESTOR_PROOF_MAP.find((entry) => entry.id === id);
      expect(item?.status).toBe("code_ready");
      expect(item?.nextGate).toMatch(/deployment/i);
    }
  });

  it("blocks stale live-booking and named-partner claims from investor entry pages", () => {
    const paths = [
      "app/institutional/page.tsx",
      "app/investors/page.tsx",
      "app/case-studies/cielo/page.tsx",
      "lib/investorDataRoom.ts",
      "lib/protocolLitepaper.ts",
      "lib/pitchDeck.ts",
      "lib/strategicPriorities.ts",
    ];
    const source = paths.map((path) => readFileSync(join(process.cwd(), path), "utf8")).join("\n");
    expect(source).not.toMatch(/live STR|live booking payments|USDC on Sui \(live booking\)|Utila.*Partner|Veriff.*Live|captured Cielo bookings/i);
    expect(source).not.toMatch(/\$1\.1M appraised|\$100M in verified/i);
  });
});
