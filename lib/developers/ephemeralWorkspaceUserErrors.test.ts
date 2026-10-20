// FILE: lib/developers/ephemeralWorkspaceUserErrors.test.ts

import { describe, expect, it } from "vitest";
import { mapEphemeralWalletOperationalError } from "./ephemeralWorkspaceUserErrors";

describe("mapEphemeralWalletOperationalError", () => {
  it("maps distributed replay misconfiguration to actionable copy", () => {
    const err = mapEphemeralWalletOperationalError({
      degradedReason: "distributed_replay_not_configured",
    });
    expect(err.title).toMatch(/unavailable/i);
    expect(err.message).toMatch(/Redis/i);
    expect(err.technicalCode).toBe("distributed_replay_not_configured");
  });

  it("maps session secret missing", () => {
    const err = mapEphemeralWalletOperationalError({
      configCode: "session_secret_missing",
    });
    expect(err.technicalCode).toBe("session_secret_missing");
    expect(err.recovery).toMatch(/32/i);
  });
});
