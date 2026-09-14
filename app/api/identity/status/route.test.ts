// FILE: app/api/identity/status/route.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const SUBJECT = "0x" + "d".repeat(64);

const mockRequireBrowserSession = vi.fn();
const mockReadCanonicalWalletBindingTruth = vi.fn();

vi.mock("@/lib/auth/browserSession", () => ({
  requireBrowserSession: (...args: unknown[]) => mockRequireBrowserSession(...args),
}));

vi.mock("@/lib/trust/readCanonicalWalletBinding", () => ({
  readCanonicalWalletBindingTruth: (...args: unknown[]) => mockReadCanonicalWalletBindingTruth(...args),
}));

const createClient = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => createClient(...args),
}));

import { GET } from "./route";

function makeSupabaseNoIdvRow() {
  return {
    from: (table: string) => {
      if (table === "identity_verifications") {
        return {
          select: () => ({
            or: () => ({
              maybeSingle: async () => ({ data: null }),
            }),
          }),
        };
      }
      if (table === "passport_documents") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({ limit: () => ({ maybeSingle: async () => ({ data: null }) }) }),
                in: () => ({ limit: () => ({ maybeSingle: async () => ({ data: null }) }) }),
                order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: null }) }) }),
              }),
            }),
          }),
        };
      }
      if (table === "sui_zklogin_identities") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { sui_address: SUBJECT } }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
}

describe("GET /api/identity/status wallet truth for pre-IDV users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-key");
    mockRequireBrowserSession.mockResolvedValue({
      ok: true,
      session: { suiAddress: SUBJECT },
    });
    createClient.mockReturnValue(makeSupabaseNoIdvRow());
  });

  it("returns wallet_binding_l3 and setup.walletBound for signed-in users without IDV rows", async () => {
    mockReadCanonicalWalletBindingTruth.mockResolvedValue({
      persisted: true,
      status: "active",
    });

    const res = await GET(new NextRequest(`http://localhost/api/identity/status?sui_address=${SUBJECT}`));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("not_started");
    expect(json.wallet_binding_l3).toBe(true);
    expect(json.wallet_binding_status).toBe("active");
    expect(json.setup.walletBound).toBe(true);
    expect(json.setup.accountComplete).toBe(true);
  });

  it("returns unavailable wallet binding without treating read failure as missing", async () => {
    mockReadCanonicalWalletBindingTruth.mockResolvedValue({
      persisted: false,
      status: "unavailable",
      read_error: "wallet_binding_read_failed",
    });

    const res = await GET(new NextRequest(`http://localhost/api/identity/status?sui_address=${SUBJECT}`));
    const json = await res.json();

    expect(json.wallet_binding_status).toBe("unavailable");
    expect(json.wallet_binding_read_error).toBe("wallet_binding_read_failed");
    expect(json.wallet_binding_l3).toBe(false);
    expect(json.setup.walletBound).toBe(false);
  });
});
