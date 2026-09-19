import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AbraxasSolanaPartnerAdapter,
  SOLANA_CLIENT_VISIBLE_KEYS,
  SOLANA_FORBIDDEN_CLIENT_KEYS,
  SOLANA_NO_FUNDS_BOUNDARY,
  SOLANA_PRIVACY_CONTRACT,
  SOLANA_REF_PARTNER_ID,
  SOLANA_REF_POLICY_ID,
  SOLANA_VERIFICATION_REUSE,
  assertNoSensitiveClientKeys,
  parseSolanaPartnerProgramId,
  solanaFixtureReceipt,
} from "@/lib/partner/solana";

function adapter(environment: "sandbox" | "production" = "sandbox") {
  return new AbraxasSolanaPartnerAdapter({
    partnerId: SOLANA_REF_PARTNER_ID,
    policyId: SOLANA_REF_POLICY_ID,
    policyVersion: 1,
    environment,
    partnerProgramId: "11111111111111111111111111111111",
  });
}

describe("Abraxas Solana Partner Adapter", () => {
  it("permits an approved valid sandbox receipt and binds claim_access", () => {
    const client = adapter();
    const result = client.evaluateFetchedReceipt(solanaFixtureReceipt("approved"));
    const bound = client.bindPartnerAction(result, "claim_access");
    expect(bound).toEqual({ allowed: true, reason: "permitted", action: "claim_access" });
    expect(Object.keys(bound).sort()).toEqual([...SOLANA_CLIENT_VISIBLE_KEYS].sort());
    expect(assertNoSensitiveClientKeys(bound)).toEqual([]);
  });

  it("rejects denied, expired, revoked, cross partner, and altered policy receipts", () => {
    const client = adapter();
    expect(client.bindPartnerAction(client.evaluateFetchedReceipt(solanaFixtureReceipt("denied")), "claim_access").reason).toBe("policy_denied");
    expect(client.bindPartnerAction(client.evaluateFetchedReceipt(solanaFixtureReceipt("expired")), "claim_access").reason).toBe("receipt_expired");
    expect(client.bindPartnerAction(client.evaluateFetchedReceipt(solanaFixtureReceipt("revoked")), "claim_access").reason).toBe("receipt_revoked");
    expect(client.bindPartnerAction(client.evaluateFetchedReceipt(solanaFixtureReceipt("cross_partner")), "continue_checkout").reason).toBe("partner_mismatch");
    expect(client.bindPartnerAction(client.evaluateFetchedReceipt(solanaFixtureReceipt("altered_policy")), "continue_checkout").reason).toBe("policy_mismatch");
  });

  it("rejects sandbox only receipts in production mode", () => {
    const production = adapter("production");
    const bound = production.bindPartnerAction(
      production.evaluateFetchedReceipt(solanaFixtureReceipt("sandbox_only")),
      "claim_access",
    );
    expect(bound.allowed).toBe(false);
    expect(bound.reason).toBe("environment_mismatch");
  });

  it("starts a hosted policy verification request without API keys", () => {
    const url = adapter().startPolicyVerification("https://partner.example/solana/callback");
    expect(url).toContain("/partner/verify");
    expect(url).toContain("partner_id=");
    expect(url).toContain("policy_id=");
    expect(url).not.toContain("abx_");
  });

  it("never creates a transaction or moves funds", () => {
    const src = readFileSync(join(__dirname, "adapter.ts"), "utf8");
    expect(src).not.toMatch(/createTransaction|sendAndConfirm|sendTransaction|SystemProgram|mintTo|transfer\(/);
    expect(src).not.toContain("@solana/web3.js");
    expect(src).toContain('@solana/kit');
    expect(adapter().createsTransactions).toBe(false);
    expect(adapter().fundsMovement).toBe(false);
    expect(SOLANA_NO_FUNDS_BOUNDARY.toLowerCase()).toContain("never creates a transaction");
  });

  it("validates optional program ids with Solana Kit address()", () => {
    expect(parseSolanaPartnerProgramId("11111111111111111111111111111111").ok).toBe(true);
    expect(parseSolanaPartnerProgramId("not-a-solana-address").ok).toBe(false);
    expect(() =>
      new AbraxasSolanaPartnerAdapter({
        partnerId: SOLANA_REF_PARTNER_ID,
        policyId: SOLANA_REF_POLICY_ID,
        environment: "sandbox",
        partnerProgramId: "not-a-solana-address",
      }),
    ).toThrow();
  });

  it("keeps privacy contract and kit reuse explicit", () => {
    expect(SOLANA_PRIVACY_CONTRACT.join(" ").toLowerCase()).toContain("google sign in");
    expect(SOLANA_PRIVACY_CONTRACT.join(" ").toLowerCase()).toContain("account");
    expect(SOLANA_PRIVACY_CONTRACT.some((line) => line.toLowerCase().includes("identity or liveness"))).toBe(true);
    expect(SOLANA_VERIFICATION_REUSE).toContain("AbraxasPartnerKit");
    expect(SOLANA_FORBIDDEN_CLIENT_KEYS).toContain("wallet_address");
  });
});
