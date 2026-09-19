import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

if (!process.env.NEXTAUTH_SECRET?.trim()) process.env.NEXTAUTH_SECRET = "wallet-standard-durable-test-secret";

vi.mock("@/lib/supabase/admin", async () => {
  const { requireWalletStandardTestAdmin } = await import("@/lib/partner/walletStandard/fakeDurableBackend");
  return { requireSupabaseAdmin: requireWalletStandardTestAdmin };
});

import { POST, GET } from "@/app/api/examples/trading-venue/preflight/route";
import { assertNoSensitiveVenueClientKeys } from "@/lib/partner/tradingVenue";
import { resetFakeWalletStandardBackend } from "@/lib/partner/walletStandard/fakeDurableBackend";

function post(body: unknown) {
  return POST(
    new NextRequest("http://localhost/api/examples/trading-venue/preflight", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("Trading venue reference preflight", () => {
  beforeEach(() => {
    resetFakeWalletStandardBackend();
  });

  it("allows enable_market_access only for the approved fixture", async () => {
    const res = await post({ fixture: "approved", action_type: "enable_market_access" });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.allowed).toBe(true);
    expect(json.reason).toBe("permitted");
    expect(json.action_binding.action_type).toBe("enable_market_access");
    expect(assertNoSensitiveVenueClientKeys(json)).toEqual([]);
  });

  it("rejects denial and replay paths", async () => {
    const cases = [
      ["denied", "policy_denied"],
      ["expired", "receipt_expired"],
      ["revoked", "receipt_revoked"],
      ["cross_partner", "partner_mismatch"],
      ["altered_policy", "policy_mismatch"],
    ] as const;
    for (const [fixture, reason] of cases) {
      const res = await post({ fixture, action_type: "enable_market_access" });
      const json = await res.json();
      expect(json.allowed).toBe(false);
      expect(json.reason).toBe(reason);
    }
    const replay = await post({ fixture: "approved", replay_contract: true });
    const replayJson = await replay.json();
    expect(replayJson.reason).toBe("replayed");
    const action = await post({ fixture: "approved", action_type: "place_order" });
    expect((await action.json()).reason).toBe("action_mismatch");
  });

  it("does not echo receipt material, wallets, or trading history", async () => {
    const res = await post({ fixture: "approved" });
    const text = await res.text();
    expect(text.toLowerCase()).not.toContain("receipt_id");
    expect(text.toLowerCase()).not.toContain("dr_venue");
    expect(text.toLowerCase()).not.toContain("signature");
    expect(text.toLowerCase()).not.toContain("wallet_address");
    expect(text.toLowerCase()).not.toContain("trading_history");
    const catalog = await GET();
    const json = await catalog.json();
    expect(json.funds_movement).toBe(false);
    expect(json.connects_wallet).toBe(false);
    expect(assertNoSensitiveVenueClientKeys(json)).toEqual([]);
  });
});
