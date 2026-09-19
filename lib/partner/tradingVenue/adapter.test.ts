import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  AbraxasTradingVenueAdapter,
  TRADING_VENUE_CLIENT_VISIBLE_KEYS,
  TRADING_VENUE_FORBIDDEN_CLIENT_KEYS,
  TRADING_VENUE_LIVE_INTEGRATION_REQUIREMENTS,
  TRADING_VENUE_NO_FUNDS_BOUNDARY,
  TRADING_VENUE_NOT_A_MARKET,
  TRADING_VENUE_WALLET_BINDING_FUTURE,
  VENUE_REF_PARTNER_ID,
  VENUE_REF_POLICY_ID,
  assertNoSensitiveVenueClientKeys,
  resetTradingVenueNonceStoreForTests,
  venueFixtureReceipt,
} from "@/lib/partner/tradingVenue";

function adapter(environment: "sandbox" | "production" = "sandbox", partnerId = VENUE_REF_PARTNER_ID) {
  return new AbraxasTradingVenueAdapter({
    partnerId,
    policyId: VENUE_REF_POLICY_ID,
    policyVersion: 1,
    environment,
  });
}

function contractFor(client: AbraxasTradingVenueAdapter) {
  const issued = client.issueActionContract({
    action_type: "enable_market_access",
    action_scope: "sandbox:market_access",
  });
  if ("ok" in issued) throw new Error("expected contract");
  return issued;
}

describe("Abraxas Trading Venue Adapter", () => {
  beforeEach(() => {
    resetTradingVenueNonceStoreForTests();
  });

  it("permits an approved valid sandbox receipt for enable_market_access", () => {
    const client = adapter();
    const contract = contractFor(client);
    const result = client.evaluateFetchedReceipt(venueFixtureReceipt("approved"));
    const bound = client.preflight({ result, contract });
    expect(bound.allowed).toBe(true);
    expect(bound.reason).toBe("permitted");
    expect(bound.action_binding.action_type).toBe("enable_market_access");
    expect(bound.action_binding.action_scope).toBe("sandbox:market_access");
    expect(bound.action_binding.nonce_state).toBe("consumed");
    expect(bound.action_binding.wallet_binding).toBe("not_attached");
    expect(bound.expires_at).toBe(contract.expires_at);
    expect(Object.keys(bound).sort()).toEqual([...TRADING_VENUE_CLIENT_VISIBLE_KEYS].sort());
    expect(assertNoSensitiveVenueClientKeys(bound)).toEqual([]);
  });

  it("rejects denied, expired, revoked, cross-partner, and altered-policy receipts", () => {
    const client = adapter();
    const cases = [
      ["denied", "policy_denied"],
      ["expired", "receipt_expired"],
      ["revoked", "receipt_revoked"],
      ["cross_partner", "partner_mismatch"],
      ["altered_policy", "policy_mismatch"],
    ] as const;
    for (const [fixture, reason] of cases) {
      const bound = client.preflight({
        result: client.evaluateFetchedReceipt(venueFixtureReceipt(fixture)),
        contract: contractFor(client),
      });
      expect(bound.allowed).toBe(false);
      expect(bound.reason).toBe(reason);
      expect(assertNoSensitiveVenueClientKeys(bound)).toEqual([]);
    }
  });

  it("rejects altered action type or scope", () => {
    const client = adapter();
    const contract = contractFor(client);
    const result = client.evaluateFetchedReceipt(venueFixtureReceipt("approved"));
    const type = client.preflight({ result, contract, action_type: "place_order" });
    expect(type.reason).toBe("action_mismatch");
    const scope = client.preflight({ result, contract, action_scope: "live:place_order" });
    expect(scope.reason).toBe("action_mismatch");
    expect(client.issueActionContract({ action_type: "place_order" })).toEqual({
      ok: false,
      reason: "action_mismatch",
    });
  });

  it("rejects replayed nonces and expired action contracts", () => {
    const client = adapter();
    const contract = contractFor(client);
    const result = client.evaluateFetchedReceipt(venueFixtureReceipt("approved"));
    expect(client.preflight({ result, contract }).allowed).toBe(true);
    const replay = client.preflight({ result, contract });
    expect(replay.allowed).toBe(false);
    expect(replay.reason).toBe("replayed");
    expect(replay.action_binding.nonce_state).toBe("replayed");

    const expired = { ...contractFor(client), expires_at: "2020-01-01T00:00:00.000Z", nonce: `${contract.nonce}-exp` };
    const stale = client.preflight({ result, contract: expired });
    expect(stale.reason).toBe("action_expired");
  });

  it("isolates tenants so another partner cannot consume this contract", () => {
    const home = adapter();
    const other = adapter("sandbox", "partner-other-tenant");
    const contract = contractFor(home);
    const result = home.evaluateFetchedReceipt(venueFixtureReceipt("approved"));
    const stolen = other.preflight({ result, contract });
    expect(stolen.allowed).toBe(false);
    expect(stolen.reason).toBe("partner_mismatch");
  });

  it("never creates a trade, transaction, wallet connection, or fund movement", () => {
    const src = readFileSync(join(__dirname, "adapter.ts"), "utf8");
    expect(src).not.toMatch(/createTransaction|sendAndConfirm|placeOrder|submitOrder|mintTo|transfer\(/);
    expect(src).not.toContain("window.solana");
    expect(src).not.toContain("privateKey");
    expect(adapter().createsTrades).toBe(false);
    expect(adapter().createsTransactions).toBe(false);
    expect(adapter().fundsMovement).toBe(false);
    expect(adapter().connectsWallet).toBe(false);
    expect(TRADING_VENUE_NO_FUNDS_BOUNDARY.toLowerCase()).toContain("never creates a trade");
    expect(TRADING_VENUE_NOT_A_MARKET.toLowerCase()).toContain("not an exchange");
    expect(TRADING_VENUE_WALLET_BINDING_FUTURE.implemented).toBe(false);
  });

  it("lists exact future live venue requirements and keeps wallet binding off", () => {
    expect(TRADING_VENUE_LIVE_INTEGRATION_REQUIREMENTS.length).toBeGreaterThanOrEqual(8);
    expect(TRADING_VENUE_LIVE_INTEGRATION_REQUIREMENTS.join(" ")).toContain("Wallet Standard");
    expect(TRADING_VENUE_FORBIDDEN_CLIENT_KEYS).toContain("wallet_address");
    expect(TRADING_VENUE_FORBIDDEN_CLIENT_KEYS).toContain("trading_history");
    const contract = contractFor(adapter());
    expect(contract.wallet_binding).toBe("not_attached");
    expect(JSON.stringify(contract)).not.toMatch(/jupiter|phantom|dydx/i);
  });
});
