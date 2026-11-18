import { describe, expect, it } from "vitest";
import {
  partnerHarnessFromPortablePersistence,
  portablePersistencePartnerId,
} from "./studioHarnessRestore";

describe("blockchain-native studio harness restore", () => {
  it("rebuilds harness metadata from portable persistence", () => {
    const persistence = {
      receipt_id: "dr_studio_test",
      public_payload: { payload_hash: "aa".repeat(32), partner_id: "partner-1", policy_id: "policy-1" },
      signature: "sig",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    };
    const harness = partnerHarnessFromPortablePersistence(persistence);
    expect(harness.persistence?.receipt_id).toBe("dr_studio_test");
    expect(portablePersistencePartnerId(persistence)).toBe("partner-1");
  });
});