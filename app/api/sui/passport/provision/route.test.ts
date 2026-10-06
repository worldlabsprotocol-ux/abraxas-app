import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as provisionPOST } from "./route";
import { SUI_RPC_UNAVAILABLE_CODE } from "@/lib/sui/rpcReadiness";

const SUI = "0x0000000000000000000000000000000000000000000000000000000000000002";

const provisionOnChainPassport = vi.fn();
const getSuiClient = vi.fn();

vi.mock("@/lib/sui/passportIssuer", () => ({
  isPassportIssuerConfigured: vi.fn(() => true),
  provisionOnChainPassport: (...args: unknown[]) => provisionOnChainPassport(...args),
  VERIFF_PASSPORT_STAMPS: 0,
}));

vi.mock("@/lib/sui/serverClient", () => ({
  getSuiClient: () => getSuiClient(),
}));

vi.mock("@/lib/sui/config", () => ({
  getActiveSuiNetwork: vi.fn(() => "devnet"),
  getSuiDeployment: vi.fn(() => ({ packageId: "0xpkg" })),
  passportTypeFilter: vi.fn(() => "0xpkg::passport::Passport"),
  suiExplorerObject: vi.fn((id: string) => `https://explorer/${id}`),
  suiExplorerTx: vi.fn((digest: string) => `https://explorer/tx/${digest}`),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: (table: string) => {
      if (table === "identity_verifications") {
        return {
          select: () => ({
            or: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { status: "approved" } }),
              }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null }),
          }),
        }),
        upsert: vi.fn(async () => ({ error: null })),
      };
    },
  })),
}));

function postProvision(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/sui/passport/provision", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/sui/passport/provision RPC failure handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
  });

  it("surfaces Sui RPC HTTP failure as controlled 503 infrastructure failure", async () => {
    provisionOnChainPassport.mockRejectedValue(new Error("Unexpected status code: 404"));
    const res = await provisionPOST(postProvision({ sui_address: SUI }));
    const json = await res.json();
    expect(res.status).toBe(503);
    expect(json.code).toBe(SUI_RPC_UNAVAILABLE_CODE);
    expect(json.error).toBe("Sui RPC unavailable");
  });

  it("does not report success when provision throws", async () => {
    provisionOnChainPassport.mockRejectedValue(new Error("Unexpected status code: 520"));
    const res = await provisionPOST(postProvision({ sui_address: SUI }));
    const json = await res.json();
    expect(json.ok).toBeUndefined();
    expect(res.status).toBe(503);
  });

  it("returns ok when provision succeeds", async () => {
    provisionOnChainPassport.mockResolvedValue({
      objectId: "0xobject",
      stampBitmask: 0,
      alreadyExisted: false,
      createTxDigest: "0xdigest",
      stampsTxDigest: null,
    });
    getSuiClient.mockReturnValue({
      getObject: vi.fn(async () => ({ data: null })),
      getOwnedObjects: vi.fn(async () => ({ data: [] })),
    });
    const res = await provisionPOST(postProvision({ sui_address: SUI }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
  });
});
