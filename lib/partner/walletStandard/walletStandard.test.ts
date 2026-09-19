import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import nacl from "tweetnacl";
import { NextRequest } from "next/server";

process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "wallet-standard-durable-test-secret";

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => {
    const { requireWalletStandardTestAdmin } = require("./fakeDurableBackend");
    return requireWalletStandardTestAdmin();
  },
}));

import { issueWalletStandardChallenge } from "@/lib/partner/walletStandard/challenge";
import { bindWalletStandard } from "@/lib/partner/walletStandard/bind";
import { resolveWalletBindingForAction, revokeWalletStandardBinding } from "@/lib/partner/walletStandard/resolve";
import { consumeWalletChallenge } from "@/lib/partner/walletStandard/store";
import { assertNoSensitiveWalletClientKeys } from "@/lib/partner/walletStandard/safety";
import { POST as challengePost } from "@/app/api/wallet-standard/challenge/route";
import { POST as bindPost } from "@/app/api/wallet-standard/bind/route";
import {
  fakeWalletInserts,
  resetFakeWalletStandardBackend,
  setFakeWalletAdminMissing,
  setFakeWalletSchemaMissing,
} from "@/lib/partner/walletStandard/fakeDurableBackend";
import {
  AbraxasTradingVenueAdapter,
  VENUE_REF_PARTNER_ID,
  VENUE_REF_POLICY_ID,
  assertNoSensitiveVenueClientKeys,
  venueFixtureReceipt,
} from "@/lib/partner/tradingVenue";
import { AbraxasPartnerKit } from "@/lib/partner/integrationKit";

const ORIGIN = "http://localhost:3000";
const PARTNER = "partner-wallet-ref";
const CONTRACT = "action-nonce-1";

function sign(message: string) {
  const keyPair = nacl.sign.keyPair();
  const signature = nacl.sign.detached(new TextEncoder().encode(message), keyPair.secretKey);
  return {
    publicKey: Buffer.from(keyPair.publicKey).toString("base64"),
    signature: Buffer.from(signature).toString("base64"),
    addressLike: Buffer.from(keyPair.publicKey).toString("hex"),
  };
}

async function issue(overrides?: { origin?: string; partnerId?: string; actionContractNonce?: string; now?: Date }) {
  const issued = await issueWalletStandardChallenge({
    origin: overrides?.origin ?? ORIGIN,
    partnerId: overrides?.partnerId ?? PARTNER,
    actionContractNonce: overrides?.actionContractNonce ?? CONTRACT,
    now: overrides?.now,
  });
  if ("ok" in issued) throw new Error(issued.status);
  return issued;
}

async function bind(challenge: { challenge_id: string; message: string }, overrides?: {
  origin?: string;
  partnerId?: string;
  actionContractNonce?: string;
  signed?: ReturnType<typeof sign>;
}) {
  const signed = overrides?.signed ?? sign(challenge.message);
  return bindWalletStandard({
    challengeId: challenge.challenge_id,
    origin: overrides?.origin ?? ORIGIN,
    partnerId: overrides?.partnerId ?? PARTNER,
    actionContractNonce: overrides?.actionContractNonce ?? CONTRACT,
    message: challenge.message,
    signature: signed.signature,
    publicKey: signed.publicKey,
  });
}

describe("Wallet Standard binding", () => {
  beforeEach(() => {
    resetFakeWalletStandardBackend();
  });

  it("binds a valid Wallet Standard message signature and hides the raw address", async () => {
    const challenge = await issue();
    const signed = sign(challenge.message);
    const bound = await bind(challenge, { signed });
    expect(bound.ok).toBe(true);
    expect(bound.status).toBe("bound");
    expect(bound.binding_ref?.startsWith("wbr_")).toBe(true);
    expect(JSON.stringify(bound)).not.toContain(signed.addressLike);
    expect(JSON.stringify(bound)).not.toContain(signed.publicKey);
    expect(assertNoSensitiveWalletClientKeys(bound)).toEqual([]);
  });

  it("rejects wrong origin, expired challenge, replay, altered contract, cross-partner, and invalid signature", async () => {
    const challenge = await issue();
    const signed = sign(challenge.message);
    expect((await bind(challenge, { origin: "https://evil.example", signed })).status).toBe("wrong_origin");

    const expired = await issue({ now: new Date(Date.now() - 10 * 60 * 1000), actionContractNonce: "expired-nonce" });
    expect((await bind(expired, { actionContractNonce: "expired-nonce" })).status).toBe("expired");

    const replayChallenge = await issue({ actionContractNonce: "replay-nonce" });
    const replaySigned = sign(replayChallenge.message);
    const first = await bind(replayChallenge, { actionContractNonce: "replay-nonce", signed: replaySigned });
    expect(first.ok).toBe(true);
    expect((await bind(replayChallenge, { actionContractNonce: "replay-nonce", signed: replaySigned })).status).toBe("replayed");

    const altered = await issue({ actionContractNonce: "altered-a" });
    expect((await bind(altered, { actionContractNonce: "altered-b" })).status).toBe("mismatched");

    const cross = await issue({ actionContractNonce: "cross-nonce" });
    expect((await bind(cross, { partnerId: "other-partner", actionContractNonce: "cross-nonce" })).status).toBe("cross_partner");

    const bad = await issue({ actionContractNonce: "bad-sig" });
    const badSigned = sign(bad.message);
    const flipped = Buffer.from(badSigned.signature, "base64");
    flipped[0] = flipped[0] ^ 0xff;
    expect((await bind(bad, {
      actionContractNonce: "bad-sig",
      signed: { ...badSigned, signature: flipped.toString("base64") },
    })).status).toBe("invalid_signature");
  });

  it("keeps no-wallet venue preflight working and fail-closes required binding errors", async () => {
    const venue = new AbraxasTradingVenueAdapter({
      partnerId: VENUE_REF_PARTNER_ID,
      policyId: VENUE_REF_POLICY_ID,
      policyVersion: 1,
      environment: "sandbox",
    });
    const open = venue.issueActionContract({ wallet_binding: "optional" });
    if ("ok" in open) throw new Error("contract");
    const approved = venue.evaluateFetchedReceipt(venueFixtureReceipt("approved"));
    const unused = await venue.preflight({ result: approved, contract: open });
    expect(unused.allowed).toBe(true);
    expect(unused.action_binding.wallet_binding).toBe("optional");

    const required = venue.issueActionContract({ wallet_binding: "required" });
    if ("ok" in required) throw new Error("contract");
    const missing = await venue.preflight({ result: approved, contract: required });
    expect(missing.allowed).toBe(false);
    expect(missing.reason).toBe("wallet_binding_missing");

    const challenge = await issue({ partnerId: VENUE_REF_PARTNER_ID, actionContractNonce: required.nonce });
    const signed = sign(challenge.message);
    const bound = await bind(challenge, {
      partnerId: VENUE_REF_PARTNER_ID,
      actionContractNonce: required.nonce,
      signed,
    });
    const ok = await venue.preflight({ result: approved, contract: required, binding_ref: bound.binding_ref });
    expect(ok.allowed).toBe(true);
    expect(ok.action_binding.wallet_binding).toBe("bound");
    const replay = await venue.preflight({ result: approved, contract: required, binding_ref: bound.binding_ref });
    expect(replay.reason).toBe("wallet_binding_replayed");
    expect(assertNoSensitiveVenueClientKeys(ok)).toEqual([]);
    expect(JSON.stringify(ok)).not.toContain(signed.publicKey);
  });

  it("never generates a transaction or moves funds", () => {
    const src = [
      readFileSync(join(__dirname, "bind.ts"), "utf8"),
      readFileSync(join(__dirname, "connector.ts"), "utf8"),
      readFileSync(join(__dirname, "challenge.ts"), "utf8"),
      readFileSync(join(__dirname, "store.ts"), "utf8"),
    ].join("\n");
    expect(src).not.toMatch(/createTransaction|signTransaction|sendAndConfirm|SystemProgram|mintTo/);
    expect(src).not.toContain("private_key");
    expect(src).not.toContain("seed phrase");
    expect(src).not.toMatch(/new Map\(|in-process fallback/i);
  });

  it("keeps Passport and receipt verification usable without a wallet", async () => {
    const kit = new AbraxasPartnerKit({
      partnerId: VENUE_REF_PARTNER_ID,
      policyId: VENUE_REF_POLICY_ID,
      policyVersion: 1,
      environment: "sandbox",
    });
    const result = kit.evaluateFetchedReceipt(venueFixtureReceipt("approved"));
    expect(result.outcome).toBe("permitted");
    const verifyPage = readFileSync(join(process.cwd(), "app/partner/verify/page.tsx"), "utf8");
    expect(verifyPage).not.toContain("signWalletStandardChallenge");
    expect(verifyPage).not.toContain("/api/wallet-standard/bind");
    const passport = readFileSync(join(process.cwd(), "app/passport/page.tsx"), "utf8");
    expect(passport).not.toContain("signWalletStandardChallenge");
    expect((await resolveWalletBindingForAction({
      mode: "not_attached",
      partnerId: PARTNER,
      actionContractNonce: CONTRACT,
    })).ok).toBe(true);
  });

  it("serves challenge and bind routes without echoing key material", async () => {
    const challengeRes = await challengePost(new NextRequest("http://localhost/api/wallet-standard/challenge", {
      method: "POST",
      headers: { "content-type": "application/json", origin: ORIGIN },
      body: JSON.stringify({ partner_id: PARTNER, action_contract_nonce: CONTRACT }),
    }));
    const challenge = await challengeRes.json() as { challenge_id: string; message: string };
    expect(challengeRes.status).toBe(200);
    expect(assertNoSensitiveWalletClientKeys(challenge)).toEqual([]);
    const signed = sign(challenge.message);
    const bindRes = await bindPost(new NextRequest("http://localhost/api/wallet-standard/bind", {
      method: "POST",
      headers: { "content-type": "application/json", origin: ORIGIN },
      body: JSON.stringify({
        challenge_id: challenge.challenge_id,
        partner_id: PARTNER,
        action_contract_nonce: CONTRACT,
        message: challenge.message,
        signature: signed.signature,
        public_key: signed.publicKey,
      }),
    }));
    const bound = await bindRes.json();
    expect(bindRes.status).toBe(200);
    expect(bound.binding_ref).toMatch(/^wbr_/);
    expect(JSON.stringify(bound)).not.toContain(signed.publicKey);
    expect(assertNoSensitiveWalletClientKeys(bound)).toEqual([]);
  });

  it("shares challenge and bind state across store instances and blocks concurrent replay", async () => {
    const challenge = await issue({ actionContractNonce: "cross-instance" });
    const signed = sign(challenge.message);
    const first = await bind(challenge, { actionContractNonce: "cross-instance", signed });
    expect(first.ok).toBe(true);
    const [a, b] = await Promise.all([
      consumeWalletChallenge(challenge.challenge_id, PARTNER),
      consumeWalletChallenge(challenge.challenge_id, PARTNER),
    ]);
    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(0);
    expect([!a.ok && a.code, !b.ok && b.code]).toContain("replayed");
  });

  it("revokes a binding and isolates partners", async () => {
    const challenge = await issue({ actionContractNonce: "revoke-me" });
    const bound = await bind(challenge, { actionContractNonce: "revoke-me" });
    expect(bound.ok).toBe(true);
    expect(await revokeWalletStandardBinding(bound.binding_ref!, PARTNER)).toBe("revoked");
    expect(await resolveWalletBindingForAction({
      mode: "required",
      bindingRef: bound.binding_ref,
      partnerId: PARTNER,
      actionContractNonce: "revoke-me",
    })).toEqual({ ok: false, status: "revoked" });

    const home = await issue({ actionContractNonce: "home-only" });
    const homeBound = await bind(home, { actionContractNonce: "home-only" });
    expect(await resolveWalletBindingForAction({
      mode: "required",
      bindingRef: homeBound.binding_ref,
      partnerId: "other-partner",
      actionContractNonce: "home-only",
    })).toEqual({ ok: false, status: "missing" });
  });

  it("fails closed when the schema or admin store is missing", async () => {
    setFakeWalletSchemaMissing(true);
    const missing = await issueWalletStandardChallenge({
      origin: ORIGIN,
      partnerId: PARTNER,
      actionContractNonce: "schema-missing",
    });
    expect(missing).toEqual({ ok: false, status: "store_unavailable" });
    setFakeWalletSchemaMissing(false);
    setFakeWalletAdminMissing(true);
    const adminMissing = await issueWalletStandardChallenge({
      origin: ORIGIN,
      partnerId: PARTNER,
      actionContractNonce: "admin-missing",
    });
    expect(adminMissing).toEqual({ ok: false, status: "store_unavailable" });
  });

  it("never writes raw address, signature, or key material to database-facing rows", async () => {
    const challenge = await issue({ actionContractNonce: "hash-only" });
    const signed = sign(challenge.message);
    await bind(challenge, { actionContractNonce: "hash-only", signed });
    const blob = JSON.stringify(fakeWalletInserts);
    expect(blob).not.toContain(signed.publicKey);
    expect(blob).not.toContain(signed.signature);
    expect(blob).not.toContain(signed.addressLike);
    expect(blob).not.toContain(ORIGIN);
    expect(blob).not.toContain("hash-only");
    for (const insert of fakeWalletInserts) {
      expect(assertNoSensitiveWalletClientKeys(insert.row)).toEqual([]);
      expect(JSON.stringify(insert.row)).not.toMatch(/wallet_address|signature|private_key|seed phrase/i);
    }
  });
});
