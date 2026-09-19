import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

if (!process.env.NEXTAUTH_SECRET?.trim()) process.env.NEXTAUTH_SECRET = "payment-authorization-test-secret";

vi.mock("@/lib/supabase/admin", async () => {
  const { requireWalletStandardTestAdmin } = await import("@/lib/partner/walletStandard/fakeDurableBackend");
  return { requireSupabaseAdmin: requireWalletStandardTestAdmin };
});

import {
  AbraxasPaymentAuthorizationAdapter,
  PAYMENT_AUTHORIZATION_CIRCLE_SEPARATION,
  PAYMENT_AUTHORIZATION_CLIENT_VISIBLE_KEYS,
  PAYMENT_AUTHORIZATION_FORBIDDEN_CLIENT_KEYS,
  PAYMENT_AUTHORIZATION_LIVE_INTEGRATION_REQUIREMENTS,
  PAYMENT_AUTHORIZATION_NO_FUNDS_BOUNDARY,
  PAYMENT_AUTHORIZATION_NOT_A_PROCESSOR,
  PAYMENT_REF_PARTNER_ID,
  PAYMENT_REF_POLICY_ID,
  assertNoSensitivePaymentClientKeys,
  paymentFixtureReceipt,
} from "@/lib/partner/paymentAuthorization";
import { resetFakeWalletStandardBackend } from "@/lib/partner/walletStandard/fakeDurableBackend";
import { CIRCLE_TESTNET_CONFIRM_FIELD } from "@/lib/settlement/circle/execute";

function adapter(environment: "sandbox" | "production" = "sandbox", partnerId = PAYMENT_REF_PARTNER_ID) {
  return new AbraxasPaymentAuthorizationAdapter({
    partnerId,
    policyId: PAYMENT_REF_POLICY_ID,
    policyVersion: 1,
    environment,
  });
}

function contractFor(
  client: AbraxasPaymentAuthorizationAdapter,
  action: "authorize_checkout" | "authorize_recurring_payment" = "authorize_checkout",
) {
  const issued = client.issueActionContract({
    action_type: action,
    action_scope: action === "authorize_checkout" ? "sandbox:checkout" : "sandbox:recurring_payment",
  });
  if ("ok" in issued) throw new Error("expected contract");
  return issued;
}

describe("Abraxas Payment Authorization Adapter", () => {
  beforeEach(() => {
    resetFakeWalletStandardBackend();
  });

  it("permits approved checkout and recurring-payment authorizations", async () => {
    const client = adapter();
    const checkout = contractFor(client, "authorize_checkout");
    const result = client.evaluateFetchedReceipt(paymentFixtureReceipt("approved"));
    const first = await client.preflight({ result, contract: checkout });
    expect(first.allowed).toBe(true);
    expect(first.reason).toBe("permitted");
    expect(first.payment_action_binding.action_type).toBe("authorize_checkout");
    expect(first.payment_action_binding.action_scope).toBe("sandbox:checkout");
    expect(first.payment_action_binding.nonce_state).toBe("consumed");
    expect(first.payment_action_binding.authorization_kind).toBe("not_a_payment");
    expect(Object.keys(first).sort()).toEqual([...PAYMENT_AUTHORIZATION_CLIENT_VISIBLE_KEYS].sort());
    expect(assertNoSensitivePaymentClientKeys(first)).toEqual([]);

    const recurring = contractFor(client, "authorize_recurring_payment");
    const second = await client.preflight({ result, contract: recurring });
    expect(second.allowed).toBe(true);
    expect(second.payment_action_binding.action_type).toBe("authorize_recurring_payment");
    expect(second.payment_action_binding.action_scope).toBe("sandbox:recurring_payment");
  });

  it("rejects denied, expired, revoked, altered scope, cross-partner, altered-policy, and replay", async () => {
    const client = adapter();
    const cases = [
      ["denied", "policy_denied"],
      ["expired", "receipt_expired"],
      ["revoked", "receipt_revoked"],
      ["cross_partner", "partner_mismatch"],
      ["altered_policy", "policy_mismatch"],
    ] as const;
    for (const [fixture, reason] of cases) {
      const bound = await client.preflight({
        result: client.evaluateFetchedReceipt(paymentFixtureReceipt(fixture)),
        contract: contractFor(client),
      });
      expect(bound.allowed).toBe(false);
      expect(bound.reason).toBe(reason);
      expect(assertNoSensitivePaymentClientKeys(bound)).toEqual([]);
    }

    const contract = contractFor(client);
    const result = client.evaluateFetchedReceipt(paymentFixtureReceipt("approved"));
    const scope = await client.preflight({ result, contract, action_scope: "sandbox:recurring_payment" });
    expect(scope.reason).toBe("action_mismatch");
    expect(client.issueActionContract({ action_type: "charge_card" })).toEqual({
      ok: false,
      reason: "action_mismatch",
    });

    expect((await client.preflight({ result, contract })).allowed).toBe(true);
    const replay = await client.preflight({ result, contract });
    expect(replay.allowed).toBe(false);
    expect(replay.reason).toBe("replayed");
  });

  it("isolates tenants so another partner cannot consume this contract", async () => {
    const home = adapter();
    const other = adapter("sandbox", "partner-other-tenant");
    const contract = contractFor(home);
    const result = home.evaluateFetchedReceipt(paymentFixtureReceipt("approved"));
    const stolen = await other.preflight({ result, contract });
    expect(stolen.allowed).toBe(false);
    expect(stolen.reason).toBe("partner_mismatch");
  });

  it("never creates a payment, transfer, transaction, or fund movement", () => {
    const src = readFileSync(join(__dirname, "adapter.ts"), "utf8");
    expect(src).not.toMatch(/createTransfer|createCharge|capturePayment|stripe\.|circle\.create|submitOrder|mintTo/);
    expect(src).not.toContain("confirm_testnet_transfer");
    expect(adapter().createsPayments).toBe(false);
    expect(adapter().createsTransfers).toBe(false);
    expect(adapter().createsSubscriptions).toBe(false);
    expect(adapter().callsCircle).toBe(false);
    expect(adapter().fundsMovement).toBe(false);
    expect(PAYMENT_AUTHORIZATION_NO_FUNDS_BOUNDARY.toLowerCase()).toContain("not a payment");
    expect(PAYMENT_AUTHORIZATION_NOT_A_PROCESSOR.toLowerCase()).toContain("not a payment processor");
    expect(PAYMENT_AUTHORIZATION_FORBIDDEN_CLIENT_KEYS).toContain("payment_details");
    expect(PAYMENT_AUTHORIZATION_FORBIDDEN_CLIENT_KEYS).toContain("transfer_id");
  });

  it("keeps Circle submit separate and confirmation-required", () => {
    expect(CIRCLE_TESTNET_CONFIRM_FIELD).toBe("confirm_testnet_transfer");
    expect(PAYMENT_AUTHORIZATION_CIRCLE_SEPARATION).toContain(CIRCLE_TESTNET_CONFIRM_FIELD);
    const execute = readFileSync(join(process.cwd(), "lib/settlement/circle/execute.ts"), "utf8");
    expect(execute).toContain("confirm_testnet_transfer");
    expect(execute).toContain("CIRCLE_TESTNET_CONFIRM_FIELD");
    expect(readFileSync(join(__dirname, "adapter.ts"), "utf8")).not.toMatch(/@\/lib\/settlement\/circle/);
    expect(PAYMENT_AUTHORIZATION_LIVE_INTEGRATION_REQUIREMENTS.join(" ")).toContain("written commerce agreement");
  });
});
