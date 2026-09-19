import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import nacl from "tweetnacl";
import { NextRequest } from "next/server";
import { issueWalletStandardChallenge } from "@/lib/partner/walletStandard/challenge";
import { bindWalletStandard } from "@/lib/partner/walletStandard/bind";
import { resolveWalletBindingForAction } from "@/lib/partner/walletStandard/resolve";
import { resetWalletStandardStoreForTests } from "@/lib/partner/walletStandard/store";
import { assertNoSensitiveWalletClientKeys } from "@/lib/partner/walletStandard/safety";
import { POST as challengePost } from "@/app/api/wallet-standard/challenge/route";
import { POST as bindPost } from "@/app/api/wallet-standard/bind/route";
import {
  AbraxasTradingVenueAdapter,
  VENUE_REF_PARTNER_ID,
  VENUE_REF_POLICY_ID,
  assertNoSensitiveVenueClientKeys,
  resetTradingVenueNonceStoreForTests,
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

function issue(overrides?: { origin?: string; partnerId?: string; actionContractNonce?: string; now?: Date }) {
  const issued = issueWalletStandardChallenge({
    origin: overrides?.origin ?? ORIGIN,
    partnerId: overrides?.partnerId ?? PARTNER,
    actionContractNonce: overrides?.actionContractNonce ?? CONTRACT,
    now: overrides?.now,
  });
  if ("ok" in issued) throw new Error(issued.status);
  return issued;
}

describe("Wallet Standard binding", () => {
  beforeEach(() => {
    resetWalletStandardStoreForTests();
    resetTradingVenueNonceStoreForTests();
  });

  it("binds a valid Wallet Standard message signature and hides the raw address", () => {
    const challenge = issue();
    const signed = sign(challenge.message);
    const bound = bindWalletStandard({
      challengeId: challenge.challenge_id,
      origin: ORIGIN,
      partnerId: PARTNER,
      actionContractNonce: CONTRACT,
      signature: signed.signature,
      publicKey: signed.publicKey,
    });
    expect(bound.ok).toBe(true);
    expect(bound.status).toBe("bound");
    expect(bound.binding_ref?.startsWith("wbr_")).toBe(true);
    expect(JSON.stringify(bound)).not.toContain(signed.addressLike);
    expect(JSON.stringify(bound)).not.toContain(signed.publicKey);
    expect(assertNoSensitiveWalletClientKeys(bound)).toEqual([]);
  });

  it("rejects wrong origin, expired challenge, replay, altered contract, cross-partner, and invalid signature", () => {
    const challenge = issue();
    const signed = sign(challenge.message);
    expect(bindWalletStandard({
      challengeId: challenge.challenge_id,
      origin: "https://evil.example",
      partnerId: PARTNER,
      actionContractNonce: CONTRACT,
      signature: signed.signature,
      publicKey: signed.publicKey,
    }).status).toBe("wrong_origin");

    const expired = issue({ now: new Date(Date.now() - 10 * 60 * 1000), actionContractNonce: "expired-nonce" });
    const expiredSigned = sign(expired.message);
    expect(bindWalletStandard({
      challengeId: expired.challenge_id,
      origin: ORIGIN,
      partnerId: PARTNER,
      actionContractNonce: "expired-nonce",
      signature: expiredSigned.signature,
      publicKey: expiredSigned.publicKey,
    }).status).toBe("expired");

    const replayChallenge = issue({ actionContractNonce: "replay-nonce" });
    const replaySigned = sign(replayChallenge.message);
    const first = bindWalletStandard({
      challengeId: replayChallenge.challenge_id,
      origin: ORIGIN,
      partnerId: PARTNER,
      actionContractNonce: "replay-nonce",
      signature: replaySigned.signature,
      publicKey: replaySigned.publicKey,
    });
    expect(first.ok).toBe(true);
    expect(bindWalletStandard({
      challengeId: replayChallenge.challenge_id,
      origin: ORIGIN,
      partnerId: PARTNER,
      actionContractNonce: "replay-nonce",
      signature: replaySigned.signature,
      publicKey: replaySigned.publicKey,
    }).status).toBe("replayed");

    const altered = issue({ actionContractNonce: "altered-a" });
    const alteredSigned = sign(altered.message);
    expect(bindWalletStandard({
      challengeId: altered.challenge_id,
      origin: ORIGIN,
      partnerId: PARTNER,
      actionContractNonce: "altered-b",
      signature: alteredSigned.signature,
      publicKey: alteredSigned.publicKey,
    }).status).toBe("mismatched");

    const cross = issue({ actionContractNonce: "cross-nonce" });
    const crossSigned = sign(cross.message);
    expect(bindWalletStandard({
      challengeId: cross.challenge_id,
      origin: ORIGIN,
      partnerId: "other-partner",
      actionContractNonce: "cross-nonce",
      signature: crossSigned.signature,
      publicKey: crossSigned.publicKey,
    }).status).toBe("cross_partner");

    const bad = issue({ actionContractNonce: "bad-sig" });
    const badSigned = sign(bad.message);
    const flipped = Buffer.from(badSigned.signature, "base64");
    flipped[0] = flipped[0] ^ 0xff;
    expect(bindWalletStandard({
      challengeId: bad.challenge_id,
      origin: ORIGIN,
      partnerId: PARTNER,
      actionContractNonce: "bad-sig",
      signature: flipped.toString("base64"),
      publicKey: badSigned.publicKey,
    }).status).toBe("invalid_signature");
  });

  it("keeps no-wallet venue preflight working and fail-closes required binding errors", () => {
    const venue = new AbraxasTradingVenueAdapter({
      partnerId: VENUE_REF_PARTNER_ID,
      policyId: VENUE_REF_POLICY_ID,
      policyVersion: 1,
      environment: "sandbox",
    });
    const open = venue.issueActionContract({ wallet_binding: "optional" });
    if ("ok" in open) throw new Error("contract");
    const approved = venue.evaluateFetchedReceipt(venueFixtureReceipt("approved"));
    const unused = venue.preflight({ result: approved, contract: open });
    expect(unused.allowed).toBe(true);
    expect(unused.action_binding.wallet_binding).toBe("optional");

    const required = venue.issueActionContract({ wallet_binding: "required" });
    if ("ok" in required) throw new Error("contract");
    const missing = venue.preflight({ result: approved, contract: required });
    expect(missing.allowed).toBe(false);
    expect(missing.reason).toBe("wallet_binding_missing");

    const challenge = issue({ partnerId: VENUE_REF_PARTNER_ID, actionContractNonce: required.nonce });
    const signed = sign(challenge.message);
    const bound = bindWalletStandard({
      challengeId: challenge.challenge_id,
      origin: ORIGIN,
      partnerId: VENUE_REF_PARTNER_ID,
      actionContractNonce: required.nonce,
      signature: signed.signature,
      publicKey: signed.publicKey,
    });
    const ok = venue.preflight({ result: approved, contract: required, binding_ref: bound.binding_ref });
    expect(ok.allowed).toBe(true);
    expect(ok.action_binding.wallet_binding).toBe("bound");
    const replay = venue.preflight({ result: approved, contract: required, binding_ref: bound.binding_ref });
    expect(replay.reason).toBe("wallet_binding_replayed");
    expect(assertNoSensitiveVenueClientKeys(ok)).toEqual([]);
    expect(JSON.stringify(ok)).not.toContain(signed.publicKey);
  });

  it("never generates a transaction or moves funds", () => {
    const src = [
      readFileSync(join(__dirname, "bind.ts"), "utf8"),
      readFileSync(join(__dirname, "connector.ts"), "utf8"),
      readFileSync(join(__dirname, "challenge.ts"), "utf8"),
    ].join("\n");
    expect(src).not.toMatch(/createTransaction|signTransaction|sendAndConfirm|SystemProgram|mintTo/);
    expect(src).not.toContain("private_key");
    expect(src).not.toContain("seed phrase");
  });

  it("keeps Passport and receipt verification usable without a wallet", () => {
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
    expect(resolveWalletBindingForAction({
      mode: "not_attached",
      partnerId: PARTNER,
      actionContractNonce: CONTRACT,
    }).ok).toBe(true);
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
});
