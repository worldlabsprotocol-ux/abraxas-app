// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { bootstrapHostedHolderSession } from "./bootstrapHostedHolderSession";

const mockSave = vi.fn();
const mockProbe = vi.fn();
const mockRestore = vi.fn();

vi.mock("@/lib/sui/zklogin/session", () => ({ saveUserSession: (...args: unknown[]) => mockSave(...args) }));
vi.mock("@/lib/auth/ensureBrowserSession", () => ({ probeBrowserSession: (...args: unknown[]) => mockProbe(...args) }));
vi.mock("@/lib/sui/zklogin/restoreBrowserSession", () => ({ restoreUserSessionFromBrowserSession: (...args: unknown[]) => mockRestore(...args) }));

const input = {
  partnerId: "good-trouble",
  policyId: "good-trouble-age_21_retail-v1",
  returnUrl: "https://www.goodtroublecanna.com/age-verification-result",
  purpose: "purchase",
  verifyRequestId: "vr_a1b2c3d4e5f67890",
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("hosted holder bootstrap confirmation", () => {
  it("does not publish a client identity when the cookie fails browser validation", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true, sui_address: `0x${"a".repeat(64)}`, session_kind: "hosted", provider: "abraxas_hosted",
    }), { status: 200 })));
    mockProbe.mockResolvedValue(false);
    expect((await bootstrapHostedHolderSession(input)).ok).toBe(false);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("continues only after the server accepts the cookie", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true, sui_address: `0x${"a".repeat(64)}`, session_kind: "hosted", provider: "abraxas_hosted",
    }), { status: 200 })));
    mockProbe.mockResolvedValue(true);
    expect((await bootstrapHostedHolderSession(input)).ok).toBe(true);
    expect(mockSave).toHaveBeenCalledOnce();
  });

  it("reuses an existing OAuth identity only after restoring its authenticated profile", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true, sui_address: `0x${"b".repeat(64)}`, session_kind: "oauth", provider: "google",
    }), { status: 200 })));
    mockProbe.mockResolvedValue(true);
    mockRestore.mockResolvedValue(null);
    expect((await bootstrapHostedHolderSession(input)).ok).toBe(false);
    expect(mockSave).not.toHaveBeenCalled();

    mockRestore.mockResolvedValue({ suiAddress: `0x${"b".repeat(64)}`, provider: "google" });
    expect((await bootstrapHostedHolderSession(input)).ok).toBe(true);
    expect(mockSave).toHaveBeenCalledOnce();
  });
});
