import { describe, expect, it } from "vitest";
import {
  mapOfficialProviderStateToIntent,
  parseOfficialProviderState,
} from "@/lib/settlement/circle/authenticated";
import {
  CIRCLE_OFFICIAL_TRANSACTION_STATES,
  CIRCLE_TERMINAL_TRANSACTION_STATES,
} from "@/lib/settlement/circle/constants";

describe("official Circle transaction state mapping", () => {
  it("accepts only the official TransactionState enum", () => {
    expect(CIRCLE_OFFICIAL_TRANSACTION_STATES).toEqual([
      "INITIATED",
      "CLEARED",
      "QUEUED",
      "SENT",
      "STUCK",
      "CONFIRMED",
      "COMPLETE",
      "FAILED",
      "DENIED",
      "CANCELLED",
    ]);
    expect(parseOfficialProviderState("PENDING")).toBeNull();
    expect(parseOfficialProviderState("BROADCASTED")).toBeNull();
    expect(parseOfficialProviderState("SUCCESS")).toBeNull();
    for (const state of CIRCLE_OFFICIAL_TRANSACTION_STATES) {
      expect(parseOfficialProviderState(state)).toBe(state);
    }
  });

  it("settles only on official COMPLETE", () => {
    expect(mapOfficialProviderStateToIntent("COMPLETE")).toBe("settled");
    expect(CIRCLE_TERMINAL_TRANSACTION_STATES).toEqual([
      "COMPLETE",
      "FAILED",
      "CANCELLED",
      "DENIED",
    ]);
  });

  it("maps official final failures to typed safe states", () => {
    expect(mapOfficialProviderStateToIntent("FAILED")).toBe("failed");
    expect(mapOfficialProviderStateToIntent("DENIED")).toBe("failed");
    expect(mapOfficialProviderStateToIntent("CANCELLED")).toBe("cancelled");
  });

  it("keeps non-final official states submitted/retrying", () => {
    for (const state of ["INITIATED", "CLEARED", "QUEUED", "SENT", "STUCK", "CONFIRMED"] as const) {
      expect(mapOfficialProviderStateToIntent(state)).toBe("submitted");
    }
  });
});
