import { describe, expect, it } from "vitest";
import { resolveIdentityUiState } from "./identityUiState";

describe("resolveIdentityUiState", () => {
  it("returns verified when credential is active", () => {
    expect(
      resolveIdentityUiState({
        identityStatus: "earned",
        hasCredential: true,
        idvProvider: "manual",
        via: "manual_review",
      }),
    ).toBe("verified");
  });

  it("returns needs_action when declined", () => {
    expect(
      resolveIdentityUiState({
        identityStatus: "declined",
        hasCredential: false,
        idvProvider: "veriff",
        via: "veriff",
      }),
    ).toBe("needs_action");
  });

  it("returns under_review for manual upload pending", () => {
    expect(
      resolveIdentityUiState({
        identityStatus: "pending",
        hasCredential: false,
        idvProvider: "manual",
        via: "manual_review",
      }),
    ).toBe("under_review");
  });

  it("returns under_review for active Veriff session", () => {
    expect(
      resolveIdentityUiState({
        identityStatus: "pending",
        hasCredential: false,
        idvProvider: "veriff",
        via: "veriff",
      }),
    ).toBe("under_review");
  });

  it("returns not_started for stale Veriff pending in manual mode", () => {
    expect(
      resolveIdentityUiState({
        identityStatus: "pending",
        hasCredential: false,
        idvProvider: "manual",
        via: "veriff",
      }),
    ).toBe("not_started");
  });

  it("returns not_started when nothing submitted", () => {
    expect(
      resolveIdentityUiState({
        identityStatus: "not_started",
        hasCredential: false,
        idvProvider: "manual",
        via: null,
      }),
    ).toBe("not_started");
  });
});
