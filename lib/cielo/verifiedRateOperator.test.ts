import { describe, it, expect } from "vitest";
import { assertValidTransition } from "@/lib/cielo/verifiedRateOperator";

describe("verifiedRateOperator transitions", () => {
  it("allows request_received → pending_review", () => {
    expect(() => assertValidTransition("request_received", "pending_review")).not.toThrow();
  });

  it("allows pending_review → eligible", () => {
    expect(() => assertValidTransition("pending_review", "eligible")).not.toThrow();
  });

  it("allows eligible → operator_confirmed", () => {
    expect(() => assertValidTransition("eligible", "operator_confirmed")).not.toThrow();
  });

  it("blocks operator_confirmed → eligible", () => {
    expect(() => assertValidTransition("operator_confirmed", "eligible")).toThrow();
  });

  it("blocks request_received → operator_confirmed", () => {
    expect(() => assertValidTransition("request_received", "operator_confirmed")).toThrow();
  });
});
