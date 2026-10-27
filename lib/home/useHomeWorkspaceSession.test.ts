import { describe, expect, it } from "vitest";
import {
  hasPersistentAccountSession,
  resolveWorkspaceSessionMode,
  type WorkspaceOverview,
} from "./useHomeWorkspaceSession";

const baseOverview: WorkspaceOverview = {
  native_account: { authenticated: false, account_id: null, partner_membership_count: 0 },
  partner_console: { authenticated: false, partner_id: null, environment: null },
};

describe("hasPersistentAccountSession", () => {
  it("requires account_id even when authenticated flag is true", () => {
    expect(
      hasPersistentAccountSession({
        ...baseOverview,
        native_account: { authenticated: true, account_id: null, partner_membership_count: 0 },
        wallet_auth: { authenticated: true, wallet_address: "abc", auth_mode: "ephemeral_wallet" },
      }),
    ).toBe(false);
  });
});

describe("resolveWorkspaceSessionMode", () => {
  it("uses native_disabled when flag is off", () => {
    expect(
      resolveWorkspaceSessionMode({
        nativeFlagEnabled: false,
        nativeOperational: false,
        authMode: "native",
        overview: baseOverview,
      }),
    ).toBe("native_disabled");
  });

  it("uses native_unavailable when flag is on but not operational", () => {
    expect(
      resolveWorkspaceSessionMode({
        nativeFlagEnabled: true,
        nativeOperational: false,
        authMode: "native",
        overview: baseOverview,
      }),
    ).toBe("native_unavailable");
  });

  it("uses needs_account when operational and unsigned", () => {
    expect(
      resolveWorkspaceSessionMode({
        nativeFlagEnabled: true,
        nativeOperational: true,
        authMode: "native",
        overview: baseOverview,
      }),
    ).toBe("needs_account");
  });

  it("does not treat ephemeral wallet as persistent account for workspace enroll", () => {
    expect(
      resolveWorkspaceSessionMode({
        nativeFlagEnabled: true,
        nativeOperational: true,
        authMode: "ephemeral_wallet",
        overview: {
          ...baseOverview,
          native_account: { authenticated: true, account_id: null, partner_membership_count: 0 },
          wallet_auth: { authenticated: true, wallet_address: "wallet", auth_mode: "ephemeral_wallet" },
        },
      }),
    ).toBe("ephemeral_sandbox_ready");
  });

  it("uses needs_workspace when account session exists without sandbox", () => {
    expect(
      resolveWorkspaceSessionMode({
        nativeFlagEnabled: true,
        nativeOperational: true,
        authMode: "native",
        overview: {
          ...baseOverview,
          native_account: {
            authenticated: true,
            account_id: "abx_ac_test1234567890",
            partner_membership_count: 0,
          },
        },
      }),
    ).toBe("needs_workspace");
  });

  it("uses has_workspace when partner console sandbox is active", () => {
    expect(
      resolveWorkspaceSessionMode({
        nativeFlagEnabled: true,
        nativeOperational: true,
        authMode: "native",
        overview: {
          native_account: {
            authenticated: true,
            account_id: "abx_ac_test1234567890",
            partner_membership_count: 1,
          },
          partner_console: { authenticated: true, partner_id: "dev-abc", environment: "sandbox" },
        },
      }),
    ).toBe("has_workspace");
  });
});
