import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

if (!process.env.NEXTAUTH_SECRET?.trim()) process.env.NEXTAUTH_SECRET = "payment-authorization-test-secret";

vi.mock("@/lib/supabase/admin", async () => {
  const { requireWalletStandardTestAdmin } = await import("@/lib/partner/walletStandard/fakeDurableBackend");
  return { requireSupabaseAdmin: requireWalletStandardTestAdmin };
});

import { GET, POST } from "@/app/api/examples/payment-authorization/preflight/route";
import { assertNoSensitivePaymentClientKeys } from "@/lib/partner/paymentAuthorization";
import { resetFakeWalletStandardBackend } from "@/lib/partner/walletStandard/fakeDurableBackend";

function post(body: unknown) {
  return POST(
    new NextRequest("http://localhost/api/examples/payment-authorization/preflight", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("Payment authorization reference preflight", () => {
  beforeEach(() => {
    resetFakeWalletStandardBackend();
  });

  it("allows authorize_checkout only for the approved fixture", async () => {
    const res = await post({ fixture: "approved", action_type: "authorize_checkout" });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.allowed).toBe(true);
    expect(json.payment_action_binding.action_type).toBe("authorize_checkout");
    expect(json.payment_action_binding.authorization_kind).toBe("not_a_payment");
    expect(assertNoSensitivePaymentClientKeys(json)).toEqual([]);
  });

  it("rejects denial and replay paths", async () => {
    const denied = await post({ fixture: "denied", action_type: "authorize_checkout" });
    expect((await denied.json()).reason).toBe("policy_denied");
    const replay = await post({ fixture: "approved", replay_contract: true });
    expect((await replay.json()).reason).toBe("replayed");
    const action = await post({ fixture: "approved", action_type: "charge_card" });
    expect((await action.json()).reason).toBe("action_mismatch");
  });

  it("does not echo payment details or receipt material", async () => {
    const res = await post({ fixture: "approved" });
    const text = await res.text();
    expect(text.toLowerCase()).not.toContain("receipt_id");
    expect(text.toLowerCase()).not.toContain("wallet_address");
    expect(text.toLowerCase()).not.toContain("transfer_id");
    const catalog = await GET();
    const json = await catalog.json();
    expect(json.funds_movement).toBe(false);
    expect(json.calls_circle).toBe(false);
    expect(assertNoSensitivePaymentClientKeys(json)).toEqual([]);
  });
});
