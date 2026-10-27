import { describe, expect, it } from "vitest";
import {
  commercialValidationGates,
  summarizeCommercialValidation,
} from "./commercialValidationGates";
import { buildPricingHypotheses } from "./pricingAndMeteringFindings";
import { FIRST_PAID_PILOT_OFFER } from "./firstPaidPilotOffer";
import { PRIMARY_INSTITUTIONAL_USE_CASE } from "./institutionalPrimaryUseCase";

describe("Build 875 commercial validation gates", () => {
  it("does not claim commercial validation by default", () => {
    const summary = summarizeCommercialValidation();
    expect(summary.commercial_validation_claimed).toBe(false);
    expect(summary.gates_validated).toBe(0);
    expect(summary.gates_total).toBeGreaterThanOrEqual(8);
  });

  it("keeps all gates unvalidated until external evidence is recorded", () => {
    for (const gate of commercialValidationGates()) {
      expect(gate.status).toBe("unvalidated");
    }
  });

  it("separates pricing hypotheses from willingness to pay", () => {
    for (const hypothesis of buildPricingHypotheses()) {
      expect(hypothesis.willingnessToPayValidated).toBe(false);
    }
  });

  it("defines pilot security controls without bypassing production gates", () => {
    expect(FIRST_PAID_PILOT_OFFER.productionAuthorizationConditions.length).toBeGreaterThan(0);
    expect(
      FIRST_PAID_PILOT_OFFER.securityControls.some((c) => c.id === "independent_verify" && c.productionGate),
    ).toBe(true);
  });

  it("positions protocol value over generic API", () => {
    expect(PRIMARY_INSTITUTIONAL_USE_CASE.notGenericVerificationApi).toMatch(/independently verifiable/i);
    expect(PRIMARY_INSTITUTIONAL_USE_CASE.existingCapabilities.length).toBeGreaterThanOrEqual(5);
  });
});
