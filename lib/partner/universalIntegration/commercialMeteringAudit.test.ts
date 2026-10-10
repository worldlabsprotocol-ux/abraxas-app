import { describe, expect, it } from "vitest";
import { auditCommercialMeteringCapabilities } from "./commercialMeteringAudit";

describe("commercial metering audit", () => {
  it("documents high-severity receipt deduplication", () => {
    const findings = auditCommercialMeteringCapabilities();
    const receipt = findings.find((f) => f.id === "metering_idempotency_receipt");
    expect(receipt?.status).toBe("implemented");
    expect(receipt?.severity).toBe("high");
  });
});
