import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import nacl from "tweetnacl";

if (!process.env.NEXTAUTH_SECRET?.trim()) process.env.NEXTAUTH_SECRET = "portable-action-contract-test-secret";

vi.mock("@/lib/supabase/admin", async () => {
  const { requireWalletStandardTestAdmin } = await import("@/lib/partner/walletStandard/fakeDurableBackend");
  return { requireSupabaseAdmin: requireWalletStandardTestAdmin };
});

import {
  AbraxasPortableActionAdapter,
  PORTABLE_ACTION_CLIENT_VISIBLE_KEYS,
  PORTABLE_ACTION_NOT_EXECUTION,
  assertNoSensitivePortableClientKeys,
} from "@/lib/partner/portableActionContract";
import { venueFixtureReceipt, VENUE_REF_PARTNER_ID, VENUE_REF_POLICY_ID } from "@/lib/partner/tradingVenue";
import { issueWalletStandardChallenge } from "@/lib/partner/walletStandard/challenge";
import { bindWalletStandard } from "@/lib/partner/walletStandard/bind";
import { resetFakeWalletStandardBackend } from "@/lib/partner/walletStandard/fakeDurableBackend";

const PARTNER = VENUE_REF_PARTNER_ID;
const POLICY = VENUE_REF_POLICY_ID;

function adapter(environment: "sandbox" | "production" = "sandbox", partnerId = PARTNER) {
  return new AbraxasPortableActionAdapter({
    partnerId,
    policyId: POLICY,
    policyVersion: 1,
    environment,
  });
}

function contractFor(
  client: AbraxasPortableActionAdapter,
  action: "grant_membership_access" | "partner_protocol_action" | "enable_market_access" = "partner_protocol_action",
) {
  const issued = client.issueActionContract({
    action_type: action,
    action_scope: action === "grant_membership_access"
      ? "sandbox:membership_access"
      : action === "enable_market_access"
        ? "sandbox:market_access"
        : "sandbox:partner_protocol",
  });
  if ("ok" in issued) throw new Error("expected contract");
  return issued;
}

function sign(message: string) {
  const keyPair = nacl.sign.keyPair();
  const signature = nacl.sign.detached(new TextEncoder().encode(message), keyPair.secretKey);
  return {
    publicKey: Buffer.from(keyPair.publicKey).toString("base64"),
    signature: Buffer.from(signature).toString("base64"),
  };
}

describe("Portable partner action contract", () => {
  beforeEach(() => {
    resetFakeWalletStandardBackend();
  });

  it("permits a generic partner protocol action from an approved current receipt", async () => {
    const client = adapter();
    const contract = contractFor(client);
    const result = client.evaluateFetchedReceipt(venueFixtureReceipt("approved"));
    const bound = await client.preflight({ result, contract });
    expect(bound.allowed).toBe(true);
    expect(bound.reason).toBe("permitted");
    expect(bound.action_binding.action_type).toBe("partner_protocol_action");
    expect(bound.action_binding.nonce_state).toBe("consumed");
    expect(Object.keys(bound).sort()).toEqual([...PORTABLE_ACTION_CLIENT_VISIBLE_KEYS].sort());
    expect(assertNoSensitivePortableClientKeys(bound)).toEqual([]);
  });

  it("permits membership access and market-access names through the same preflight", async () => {
    const client = adapter();
    const result = client.evaluateFetchedReceipt(venueFixtureReceipt("approved"));
    const membership = await client.preflight({ result, contract: contractFor(client, "grant_membership_access") });
    expect(membership.allowed).toBe(true);
    expect(membership.action_binding.action_type).toBe("grant_membership_access");
    const market = await client.preflight({ result, contract: contractFor(client, "enable_market_access") });
    expect(market.allowed).toBe(true);
    expect(market.action_binding.action_scope).toBe("sandbox:market_access");
  });

  it("rejects wrong partner, policy, version, action, and scope", async () => {
    const client = adapter();
    const result = client.evaluateFetchedReceipt(venueFixtureReceipt("approved"));
    const stolen = await adapter("sandbox", "partner-other-tenant").preflight({
      result,
      contract: contractFor(client),
    });
    expect(stolen.reason).toBe("partner_mismatch");

    const forgedPolicy = { ...contractFor(client), policy_id: "other-policy", nonce: "n-policy" };
    expect((await client.preflight({ result, contract: forgedPolicy })).reason).toBe("policy_mismatch");

    const forgedVersion = { ...contractFor(client), policy_version: 9, nonce: "n-version" };
    expect((await client.preflight({ result, contract: forgedVersion })).reason).toBe("policy_mismatch");

    const type = await client.preflight({
      result,
      contract: contractFor(client),
      action_type: "place_order",
    });
    expect(type.reason).toBe("action_mismatch");
    expect(client.issueActionContract({ action_type: "place_order" })).toEqual({
      ok: false,
      reason: "action_mismatch",
    });
  });

  it("rejects expired, revoked, and denied receipts plus nonce replay", async () => {
    const client = adapter();
    const cases = [
      ["denied", "policy_denied"],
      ["expired", "receipt_expired"],
      ["revoked", "receipt_revoked"],
    ] as const;
    for (const [fixture, reason] of cases) {
      const bound = await client.preflight({
        result: client.evaluateFetchedReceipt(venueFixtureReceipt(fixture)),
        contract: contractFor(client),
      });
      expect(bound.allowed).toBe(false);
      expect(bound.reason).toBe(reason);
    }
    const contract = contractFor(client);
    const approved = client.evaluateFetchedReceipt(venueFixtureReceipt("approved"));
    expect((await client.preflight({ result: approved, contract })).allowed).toBe(true);
    const replay = await client.preflight({ result: approved, contract });
    expect(replay.reason).toBe("replayed");
  });

  it("enforces wallet optional and required modes without leaking addresses", async () => {
    const client = adapter();
    const approved = client.evaluateFetchedReceipt(venueFixtureReceipt("approved"));
    const optional = client.issueActionContract({
      action_type: "partner_protocol_action",
      wallet_binding: "optional",
    });
    if ("ok" in optional) throw new Error("contract");
    const unused = await client.preflight({ result: approved, contract: optional });
    expect(unused.allowed).toBe(true);
    expect(unused.action_binding.wallet_binding).toBe("optional");

    const required = client.issueActionContract({
      action_type: "grant_membership_access",
      wallet_binding: "required",
    });
    if ("ok" in required) throw new Error("contract");
    const missing = await client.preflight({ result: approved, contract: required });
    expect(missing.reason).toBe("wallet_binding_missing");

    const challenge = await issueWalletStandardChallenge({
      origin: "http://localhost:3000",
      partnerId: PARTNER,
      actionContractNonce: required.nonce,
    });
    if ("ok" in challenge) throw new Error(challenge.status);
    const signed = sign(challenge.message);
    const bound = await bindWalletStandard({
      challengeId: challenge.challenge_id,
      origin: "http://localhost:3000",
      partnerId: PARTNER,
      actionContractNonce: required.nonce,
      message: challenge.message,
      signature: signed.signature,
      publicKey: signed.publicKey,
    });
    const ok = await client.preflight({ result: approved, contract: required, binding_ref: bound.binding_ref });
    expect(ok.allowed).toBe(true);
    expect(ok.action_binding.wallet_binding).toBe("bound");
    expect(JSON.stringify(ok)).not.toContain(signed.publicKey);
  });

  it("rejects sandbox/production boundary, extra keys, and production activation fields", async () => {
    const sandbox = adapter("sandbox");
    const production = adapter("production");
    const approved = sandbox.evaluateFetchedReceipt(venueFixtureReceipt("approved"));
    const env = await production.preflight({ result: approved, contract: contractFor(sandbox) });
    expect(env.reason).toBe("environment_mismatch");

    const extra = await sandbox.preflight({
      result: approved,
      contract: { ...contractFor(sandbox), activate_production: true } as never,
    });
    expect(extra.reason).toBe("invalid");
    const browser = await sandbox.preflight({
      result: approved,
      contract: { ...contractFor(sandbox), from_browser: true } as never,
    });
    expect(browser.reason).toBe("invalid");
  });

  it("isolates tenants and never executes, transacts, or moves funds", () => {
    const src = readFileSync(join(__dirname, "adapter.ts"), "utf8");
    expect(src).not.toMatch(/createTransaction|sendAndConfirm|placeOrder|createCharge|createTransfer|mintTo/);
    expect(adapter().executesAction).toBe(false);
    expect(adapter().createsTrades).toBe(false);
    expect(adapter().createsPayments).toBe(false);
    expect(adapter().fundsMovement).toBe(false);
    expect(adapter().connectsWallet).toBe(false);
    expect(PORTABLE_ACTION_NOT_EXECUTION.toLowerCase()).toContain("never executes");
  });
});
