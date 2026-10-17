import { describe, expect, it } from "vitest";
import {
  resolvePassportEntryPhase,
  shouldFetchProtectedPassportData,
  shouldShowPassportStatusOutageBanner,
} from "./passportEntryState";

describe("passportEntryState", () => {
  it("does not fetch protected data without authenticated browser session", () => {
    expect(shouldFetchProtectedPassportData({
      walletDone: true,
      browserSessionState: "reauthentication_required",
    })).toBe(false);
    expect(shouldFetchProtectedPassportData({
      walletDone: true,
      browserSessionState: "authenticated",
    })).toBe(true);
  });

  it("treats signed-out users as entry not outage", () => {
    const phase = resolvePassportEntryPhase({
      authLoading: false,
      walletDone: false,
      browserSessionState: "idle",
      pipelineLoading: false,
      pipelineErrorKind: "network",
      hasPipelineData: false,
    });
    expect(phase).toBe("signed_out");
    expect(shouldShowPassportStatusOutageBanner({ phase, pipelineErrorKind: "network" })).toBe(false);
  });

  it("maps session_required pipeline errors to session_expired phase", () => {
    const phase = resolvePassportEntryPhase({
      authLoading: false,
      walletDone: true,
      browserSessionState: "authenticated",
      pipelineLoading: false,
      pipelineErrorKind: "session_required",
      hasPipelineData: false,
    });
    expect(phase).toBe("session_expired");
  });
});
