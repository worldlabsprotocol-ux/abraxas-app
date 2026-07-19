// FILE: lib/authenticationProof/proofLifecycle.test.ts

import { describe, expect, it } from "vitest";
import {
  extractAssetAbxId,
  lifecycleStatusForMonitoring,
  proofStillReliable,
} from "./proofLifecycle";

describe("proofLifecycle", () => {
  it("extracts ABX asset id from payload", () => {
    expect(
      extractAssetAbxId({ asset_id: "ABX-RE-HOSP-001" }, "dec-1"),
    ).toBe("ABX-RE-HOSP-001");
    expect(extractAssetAbxId({}, "ABX-RE-LAND-006")).toBe("ABX-RE-LAND-006");
  });

  it("maps monitoring actions to lifecycle status", () => {
    expect(
      lifecycleStatusForMonitoring({
        action: "revoke",
        reasonCode: "x",
        summary: "x",
        failClosed: true,
      }),
    ).toBe("superseded");
    expect(
      lifecycleStatusForMonitoring({
        action: "refresh",
        reasonCode: "x",
        summary: "x",
        failClosed: true,
      }),
    ).toBe("refresh_required");
  });

  it("proof reliability follows lifecycle status", () => {
    expect(proofStillReliable("active")).toBe(true);
    expect(proofStillReliable("refresh_required")).toBe(false);
    expect(proofStillReliable("superseded")).toBe(false);
  });
});
