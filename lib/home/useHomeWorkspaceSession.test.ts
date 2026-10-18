import { describe, expect, it } from "vitest";
import { resolveWorkspaceSessionMode } from "./useHomeWorkspaceSession";

const baseOverview = {
  native_account: { authenticated: false, account_id: null, partner_membership_count: 0 },
  partner_console: { authenticated: false, partner_id: null, environment: null },
};

describe("resolveWorkspaceSessionMode", () => {
  it("uses native_disabled when flag is off", () => {
    expect(
      resolveWorkspaceSessionMode({
        nativeFlagEnabled: false,
        nativeOperational: false,
        overview: baseOverview,
      }),
    ).toBe("native_disabled");
  });

  it("uses native_unavailable when flag is on but not operational", () => {
    expect(
      resolveWorkspaceSessionMode({
        nativeFlagEnabled: true,
        nativeOperational: false,
        overview: baseOverview,
      }),
    ).toBe("native_unavailable");
  });

  it("uses needs_account when operational and unsigned", () => {
    expect(
      resolveWorkspaceSessionMode({
        nativeFlagEnabled: true,
        nativeOperational: true,
        overview: baseOverview,
      }),
    ).toBe("needs_account");
  });
});
