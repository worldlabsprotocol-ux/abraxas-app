import { describe, expect, it } from "vitest";
import {
  emptyExternalDeveloperMetrics,
  validateExternalDeveloperMetrics,
} from "./externalDeveloperAcceptance";

describe("external developer acceptance", () => {
  it("rejects automated reference as unaided adoption", () => {
    const m = { ...emptyExternalDeveloperMetrics(), evidence_class: "automated_reference_run" as const };
    expect(validateExternalDeveloperMetrics(m).ok).toBe(false);
  });

  it("requires measured fields for unaided class", () => {
    const incomplete = {
      ...emptyExternalDeveloperMetrics(),
      evidence_class: "unaided_external_developer" as const,
    };
    expect(validateExternalDeveloperMetrics(incomplete).ok).toBe(false);
  });
});
