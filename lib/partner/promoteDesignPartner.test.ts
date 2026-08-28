// FILE: lib/partner/promoteDesignPartner.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DESIGN_PARTNER_PROMOTE_RPC_V2,
  DesignPartnerPromoteError,
  promoteDesignPartnerApplication,
} from "@/lib/partner/promoteDesignPartner";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://placeholder.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
});

const createClientMock = vi.hoisted(() => vi.fn());
const rpcMock = vi.hoisted(() => vi.fn());

vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

vi.mock("@/lib/partner/partnerAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/partner/partnerAuth")>();
  return {
    ...actual,
    generatePartnerKey: vi.fn(() => ({
      raw: "abx_test_abcdefg_restignored",
      prefix: "abx_test_abcdefg",
      hash: "a".repeat(64),
    })),
  };
});

const APP_ID = "00000000-0000-4000-8000-000000000001";

describe("promoteDesignPartnerApplication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rpcMock.mockReset();
    createClientMock.mockReturnValue({ rpc: rpcMock });
  });

  it("invokes design_partner_promote_atomic_v2 exactly once without pre-load query", async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        ok: true,
        code: "ok",
        application_id: APP_ID,
        partner_id: "acme-v1",
        key_prefix: "abx_test_abcdefg",
      },
      error: null,
    });

    const result = await promoteDesignPartnerApplication({
      applicationId: APP_ID,
      partnerId: "acme-v1",
      actorCategory: "admin_pin",
    });

    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock.mock.calls[0]?.[0]).toBe(DESIGN_PARTNER_PROMOTE_RPC_V2);
    expect(rpcMock.mock.calls[0]?.[0]).not.toBe("design_partner_promote_atomic");
    expect(rpcMock.mock.calls[0]?.[1]).toMatchObject({
      p_application_id: APP_ID,
      p_partner_id: "acme-v1",
      p_key_prefix: "abx_test_abcdefg",
      p_key_hash: "a".repeat(64),
      p_actor_category: "admin_pin",
    });
    expect(result.api_key).toBe("abx_test_abcdefg_restignored");
    expect(result.partner_id).toBe("acme-v1");
  });

  it("maps sandbox rollback signals from rpc transport errors", async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: "partner_id_conflict" },
    });

    await expect(promoteDesignPartnerApplication({
      applicationId: APP_ID,
      partnerId: "acme-v1",
      actorCategory: "admin_authorized_email",
    })).rejects.toMatchObject({ code: "partner_id_conflict" } satisfies Partial<DesignPartnerPromoteError>);
  });

  it("maps application_rejected from rpc envelope", async () => {
    rpcMock.mockResolvedValueOnce({
      data: { ok: false, code: "application_rejected" },
      error: null,
    });

    await expect(promoteDesignPartnerApplication({
      applicationId: APP_ID,
      partnerId: "acme-v1",
      actorCategory: "admin_unknown",
    })).rejects.toMatchObject({ code: "application_rejected" });
  });

  it("rejects invalid partner_id before rpc", async () => {
    await expect(promoteDesignPartnerApplication({
      applicationId: APP_ID,
      partnerId: "INVALID ID",
      actorCategory: "admin_pin",
    })).rejects.toMatchObject({ code: "invalid_input" });
    expect(rpcMock).not.toHaveBeenCalled();
  });
});
