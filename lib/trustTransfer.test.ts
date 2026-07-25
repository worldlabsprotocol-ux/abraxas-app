import { describe, expect, it } from "vitest";
import {
  TRUST_TRANSFER_HEADLINE,
  VERIFICATION_CHAIN_STEPS,
  HOW_OTHERS_VERIFY_POINTS,
  INTEGRATE_COUNTERPARTY_TRUST,
  CINEMATIC_TRUST_TRANSFER_LINE,
} from "./trustTransfer";

describe("trustTransfer", () => {
  it("states portable proof in headline", () => {
    expect(TRUST_TRANSFER_HEADLINE.toLowerCase()).toContain("portable");
    expect(TRUST_TRANSFER_HEADLINE.toLowerCase()).toContain("without doing the work");
  });

  it("defines four-step verification chain ending with independent verify", () => {
    expect(VERIFICATION_CHAIN_STEPS).toHaveLength(4);
    expect(VERIFICATION_CHAIN_STEPS[3]?.title.toLowerCase()).toContain("anyone");
  });

  it("lists relying-party verify paths", () => {
    expect(HOW_OTHERS_VERIFY_POINTS.length).toBeGreaterThanOrEqual(4);
    expect(HOW_OTHERS_VERIFY_POINTS.some(p => p.includes("/api/credentials/verify"))).toBe(true);
  });

  it("answers counterparty trust for integrate page", () => {
    expect(INTEGRATE_COUNTERPARTY_TRUST.title).toBe("Why counterparties trust it");
    expect(INTEGRATE_COUNTERPARTY_TRUST.body.toLowerCase()).toContain("cryptographically");
    expect(INTEGRATE_COUNTERPARTY_TRUST.bullets.length).toBeGreaterThanOrEqual(4);
  });

  it("uses cinematic trust-transfer line for animation", () => {
    expect(CINEMATIC_TRUST_TRANSFER_LINE.toLowerCase()).toContain("verifies the proof");
  });
});
