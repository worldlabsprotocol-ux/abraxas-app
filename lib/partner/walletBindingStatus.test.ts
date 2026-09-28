// FILE: lib/partner/walletBindingStatus.test.ts
import { describe, expect, it } from "vitest";
import { classifyStoredWalletBinding } from "@/lib/partner/walletBindingStatus";

const future = "2030-01-01T00:00:00.000Z";
const past = "2020-01-01T00:00:00.000Z";
const now = new Date("2026-01-01T00:00:00.000Z");

describe("classifyStoredWalletBinding", () => {
  it("returns an active opaque binding without wallet material", () => {
    expect(classifyStoredWalletBinding({
      binding_ref: "wsb_safe",
      expires_at: future,
      consumed_at: null,
      revoked_at: null,
    }, now)).toEqual({
      ok: true,
      status: "bound",
      binding_ref: "wsb_safe",
      expires_at: future,
    });
  });

  it("preserves expired, revoked, and consumed states for reconnect UI", () => {
    expect(classifyStoredWalletBinding({
      binding_ref: "wsb_expired",
      expires_at: past,
      consumed_at: null,
      revoked_at: null,
    }, now).status).toBe("expired");
    expect(classifyStoredWalletBinding({
      binding_ref: "wsb_revoked",
      expires_at: future,
      consumed_at: null,
      revoked_at: "2025-01-01T00:00:00.000Z",
    }, now).status).toBe("revoked");
    expect(classifyStoredWalletBinding({
      binding_ref: "wsb_used",
      expires_at: future,
      consumed_at: "2025-01-01T00:00:00.000Z",
      revoked_at: null,
    }, now).status).toBe("replayed");
  });

  it("returns a safe empty state", () => {
    expect(classifyStoredWalletBinding(null, now)).toEqual({
      ok: false,
      status: "not_attached",
      binding_ref: null,
      expires_at: null,
    });
  });
});
