import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { NextRequest } from "next/server";

if (!process.env.NEXTAUTH_SECRET?.trim()) process.env.NEXTAUTH_SECRET = "evm-wallet-binding-test-secret";

vi.mock("@/lib/supabase/admin", async () => {
  const { requireWalletStandardTestAdmin } = await import("@/lib/partner/walletStandard/fakeDurableBackend");
  return { requireSupabaseAdmin: requireWalletStandardTestAdmin };
});

import { issueEvmWalletChallenge } from "@/lib/partner/evmWalletBinding/challenge";
import { bindEvmWalletControl } from "@/lib/partner/evmWalletBinding/bind";
import { resolveEvmWalletBindingForAction } from "@/lib/partner/evmWalletBinding/resolve";
import {
  EVM_WALLET_MIGRATION_PLAN,
  EVM_WALLET_NO_TRANSACTION,
  EVM_WALLET_SIGNING_LIBRARY,
  EVM_WALLET_SIGNING_STANDARD,
  assertNoSensitiveEvmWalletClientKeys,
} from "@/lib/partner/evmWalletBinding";
import { POST as challengePost } from "@/app/api/evm-wallet-binding/challenge/route";
import { POST as bindPost } from "@/app/api/evm-wallet-binding/bind/route";
import {
  fakeWalletInserts,
  resetFakeWalletStandardBackend,
  setFakeWalletAdminMissing,
  setFakeWalletSchemaMissing,
} from "@/lib/partner/walletStandard/fakeDurableBackend";
import {
  AbraxasEvmPartnerAdapter,
  EVM_REF_PARTNER_ID,
  EVM_REF_POLICY_ID,
  assertNoSensitiveEvmClientKeys,
  evmFixtureReceipt,
} from "@/lib/partner/evm";
import { getNetworkCapability } from "@/lib/partner/networkCapability";
import { generateStarterKit } from "@/lib/partner/starterKit/generate";
import { validateStarterKitInput } from "@/lib/partner/starterKit/validate";

const ORIGIN = "http://localhost:3000";
const NETWORK = "evm_sandbox";

async function sign(message: string) {
  const account = privateKeyToAccount(generatePrivateKey());
  const signature = await account.signMessage({ message });
  return { address: account.address, signature };
}

async function issue(overrides?: {
  origin?: string;
  partnerId?: string;
  policyId?: string;
  policyVersion?: number;
  actionType?: string;
  actionScope?: string;
  networkId?: string;
  actionContractNonce?: string;
  now?: Date;
}) {
  const issued = await issueEvmWalletChallenge({
    origin: overrides?.origin ?? ORIGIN,
    partnerId: overrides?.partnerId ?? EVM_REF_PARTNER_ID,
    policyId: overrides?.policyId ?? EVM_REF_POLICY_ID,
    policyVersion: overrides?.policyVersion ?? 1,
    actionType: overrides?.actionType ?? "enable_protocol_access",
    actionScope: overrides?.actionScope ?? "sandbox:protocol_access",
    networkId: overrides?.networkId ?? NETWORK,
    actionContractNonce: overrides?.actionContractNonce ?? "evm-action-nonce-1",
    now: overrides?.now,
  });
  if ("ok" in issued) throw new Error(issued.status);
  return issued;
}

describe("EVM wallet-control binding", () => {
  beforeEach(() => {
    resetFakeWalletStandardBackend();
  });

  it("binds a valid EIP-191 personal_sign proof without leaking the address", async () => {
    const challenge = await issue();
    const signed = await sign(challenge.message);
    const bound = await bindEvmWalletControl({
      challengeId: challenge.challenge_id,
      origin: ORIGIN,
      partnerId: EVM_REF_PARTNER_ID,
      policyId: EVM_REF_POLICY_ID,
      policyVersion: 1,
      actionType: "enable_protocol_access",
      actionScope: "sandbox:protocol_access",
      networkId: NETWORK,
      actionContractNonce: "evm-action-nonce-1",
      message: challenge.message,
      signature: signed.signature,
    });
    expect(bound.ok).toBe(true);
    expect(bound.status).toBe("bound");
    expect(bound.binding_ref?.startsWith("ewb_")).toBe(true);
    expect(JSON.stringify(bound).toLowerCase()).not.toContain(signed.address.toLowerCase());
    expect(JSON.stringify(bound)).not.toContain(signed.signature);
    expect(assertNoSensitiveEvmWalletClientKeys(bound)).toEqual([]);
    expect(challenge.message).toContain(EVM_WALLET_NO_TRANSACTION);
    expect(challenge.message.toLowerCase()).toContain("message proof only");
    expect(EVM_WALLET_SIGNING_STANDARD).toBe("eip191_personal_sign");
    expect(EVM_WALLET_SIGNING_LIBRARY).toContain("viem");
  });

  it("rejects wrong domain, expired challenge, replay, altered action/scope/network/policy/version, cross-partner, and invalid signature", async () => {
    const challenge = await issue();
    const signed = await sign(challenge.message);
    const base = {
      challengeId: challenge.challenge_id,
      origin: ORIGIN,
      partnerId: EVM_REF_PARTNER_ID,
      policyId: EVM_REF_POLICY_ID,
      policyVersion: 1,
      actionType: "enable_protocol_access",
      actionScope: "sandbox:protocol_access",
      networkId: NETWORK,
      actionContractNonce: "evm-action-nonce-1",
      message: challenge.message,
      signature: signed.signature,
    };
    expect((await bindEvmWalletControl({ ...base, origin: "https://evil.example" })).status).toBe("wrong_origin");

    const expired = await issue({ now: new Date(Date.now() - 10 * 60 * 1000), actionContractNonce: "expired-nonce" });
    const expiredSigned = await sign(expired.message);
    expect((await bindEvmWalletControl({
      ...base,
      challengeId: expired.challenge_id,
      actionContractNonce: "expired-nonce",
      message: expired.message,
      signature: expiredSigned.signature,
    })).status).toBe("expired");

    const replayChallenge = await issue({ actionContractNonce: "replay-nonce" });
    const replaySigned = await sign(replayChallenge.message);
    const first = await bindEvmWalletControl({
      ...base,
      challengeId: replayChallenge.challenge_id,
      actionContractNonce: "replay-nonce",
      message: replayChallenge.message,
      signature: replaySigned.signature,
    });
    expect(first.ok).toBe(true);
    expect((await bindEvmWalletControl({
      ...base,
      challengeId: replayChallenge.challenge_id,
      actionContractNonce: "replay-nonce",
      message: replayChallenge.message,
      signature: replaySigned.signature,
    })).status).toBe("replayed");

    const altered = await issue({ actionContractNonce: "altered-a" });
    const alteredSigned = await sign(altered.message);
    expect((await bindEvmWalletControl({
      ...base,
      challengeId: altered.challenge_id,
      actionContractNonce: "altered-b",
      message: altered.message,
      signature: alteredSigned.signature,
    })).status).toBe("mismatched");
    expect((await bindEvmWalletControl({
      ...base,
      challengeId: altered.challenge_id,
      actionContractNonce: "altered-a",
      actionType: "enable_member_access",
      actionScope: "sandbox:member_access",
      message: altered.message,
      signature: alteredSigned.signature,
    })).status).toBe("mismatched");
    expect((await bindEvmWalletControl({
      ...base,
      challengeId: altered.challenge_id,
      actionContractNonce: "altered-a",
      networkId: "evm_mainnet",
      message: altered.message,
      signature: alteredSigned.signature,
    })).status).toBe("mismatched");
    expect((await bindEvmWalletControl({
      ...base,
      challengeId: altered.challenge_id,
      actionContractNonce: "altered-a",
      policyVersion: 9,
      message: altered.message,
      signature: alteredSigned.signature,
    })).status).toBe("mismatched");

    const cross = await issue({ actionContractNonce: "cross-nonce" });
    const crossSigned = await sign(cross.message);
    expect((await bindEvmWalletControl({
      ...base,
      challengeId: cross.challenge_id,
      partnerId: "other-partner",
      actionContractNonce: "cross-nonce",
      message: cross.message,
      signature: crossSigned.signature,
    })).status).toBe("cross_partner");

    const bad = await issue({ actionContractNonce: "bad-sig" });
    expect((await bindEvmWalletControl({
      ...base,
      challengeId: bad.challenge_id,
      actionContractNonce: "bad-sig",
      message: bad.message,
      signature: "0xdead",
    })).status).toBe("invalid_signature");
  });

  it("keeps optional unused allowed and requires a matching binding when required", async () => {
    const adapter = new AbraxasEvmPartnerAdapter({
      partnerId: EVM_REF_PARTNER_ID,
      policyId: EVM_REF_POLICY_ID,
      policyVersion: 1,
      environment: "sandbox",
    });
    const approved = adapter.evaluateFetchedReceipt(evmFixtureReceipt("approved"));
    const optional = adapter.issueActionContract({ wallet_binding: "optional" });
    if ("ok" in optional) throw new Error("contract");
    const unused = await adapter.preflight({ result: approved, contract: optional });
    expect(unused.allowed).toBe(true);
    expect(unused.action_binding.wallet_binding).toBe("optional");

    const required = adapter.issueActionContract({
      action_type: "enable_member_access",
      wallet_binding: "required",
    });
    if ("ok" in required) throw new Error("contract");
    const missing = await adapter.preflight({ result: approved, contract: required });
    expect(missing.allowed).toBe(false);
    expect(missing.reason).toBe("wallet_binding_missing");

    const challenge = await issue({
      partnerId: EVM_REF_PARTNER_ID,
      actionType: required.action_type,
      actionScope: required.action_scope,
      networkId: required.network_context?.network_id ?? NETWORK,
      actionContractNonce: required.nonce,
    });
    const signed = await sign(challenge.message);
    const bound = await bindEvmWalletControl({
      challengeId: challenge.challenge_id,
      origin: ORIGIN,
      partnerId: EVM_REF_PARTNER_ID,
      policyId: EVM_REF_POLICY_ID,
      policyVersion: 1,
      actionType: required.action_type,
      actionScope: required.action_scope,
      networkId: required.network_context?.network_id ?? NETWORK,
      actionContractNonce: required.nonce,
      message: challenge.message,
      signature: signed.signature,
    });
    const ok = await adapter.preflight({ result: approved, contract: required, binding_ref: bound.binding_ref });
    expect(ok.allowed).toBe(true);
    expect(ok.action_binding.wallet_binding).toBe("bound");
    expect(assertNoSensitiveEvmClientKeys(ok)).toEqual([]);
    expect(getNetworkCapability("evm_mainnet")?.status).toBe("production_review_required");
  });

  it("fails closed when the durable store is unavailable and never calls RPC or moves funds", async () => {
    setFakeWalletSchemaMissing(true);
    const missing = await issueEvmWalletChallenge({
      origin: ORIGIN,
      partnerId: EVM_REF_PARTNER_ID,
      policyId: EVM_REF_POLICY_ID,
      policyVersion: 1,
      actionType: "enable_protocol_access",
      actionScope: "sandbox:protocol_access",
      networkId: NETWORK,
      actionContractNonce: "store-miss",
    });
    expect(missing).toMatchObject({ ok: false, status: "store_unavailable" });
    setFakeWalletSchemaMissing(false);
    setFakeWalletAdminMissing(true);
    const admin = await issueEvmWalletChallenge({
      origin: ORIGIN,
      partnerId: EVM_REF_PARTNER_ID,
      policyId: EVM_REF_POLICY_ID,
      policyVersion: 1,
      actionType: "enable_protocol_access",
      actionScope: "sandbox:protocol_access",
      networkId: NETWORK,
      actionContractNonce: "admin-miss",
    });
    expect(admin).toMatchObject({ ok: false, status: "store_unavailable" });
    setFakeWalletAdminMissing(false);

    const src = [
      readFileSync(join(process.cwd(), "lib/partner/evmWalletBinding/bind.ts"), "utf8"),
      readFileSync(join(process.cwd(), "lib/partner/evmWalletBinding/verify.ts"), "utf8"),
    ].join("\n");
    expect(src).not.toMatch(/sendTransaction|getBalance|eth_call|window\.ethereum/i);
    expect(src).toContain("recoverMessageAddress");
    expect(fakeWalletInserts.every((row) => !JSON.stringify(row).includes("0x"))).toBe(true);
  });

  it("rejects client override keys on HTTP routes and does not leak signatures", async () => {
    const adapter = new AbraxasEvmPartnerAdapter({
      partnerId: EVM_REF_PARTNER_ID,
      policyId: EVM_REF_POLICY_ID,
      policyVersion: 1,
      environment: "sandbox",
    });
    const contract = adapter.issueActionContract();
    if ("ok" in contract) throw new Error("contract");
    const override = await challengePost(new NextRequest("http://localhost/api/evm-wallet-binding/challenge", {
      method: "POST",
      body: JSON.stringify({
        origin: ORIGIN,
        contract,
        wallet_address: "0xabc",
        chain_id: 1,
      }),
    }));
    expect(override.status).toBe(400);

    const issued = await challengePost(new NextRequest("http://localhost/api/evm-wallet-binding/challenge", {
      method: "POST",
      headers: { origin: ORIGIN, "content-type": "application/json" },
      body: JSON.stringify({ origin: ORIGIN, contract }),
    }));
    expect(issued.status).toBe(200);
    const challenge = await issued.json() as { challenge_id: string; message: string };
    expect(assertNoSensitiveEvmWalletClientKeys(challenge)).toEqual([]);
    expect(challenge.message).toContain("No transaction will be created or signed");
    const signed = await sign(challenge.message);
    const bound = await bindPost(new NextRequest("http://localhost/api/evm-wallet-binding/bind", {
      method: "POST",
      headers: { origin: ORIGIN, "content-type": "application/json" },
      body: JSON.stringify({
        origin: ORIGIN,
        challenge_id: challenge.challenge_id,
        message: challenge.message,
        signature: signed.signature,
        contract,
      }),
    }));
    const json = await bound.json();
    expect(bound.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(JSON.stringify(json)).not.toContain(signed.signature);
    expect(JSON.stringify(json).toLowerCase()).not.toContain(signed.address.toLowerCase());
    expect(assertNoSensitiveEvmWalletClientKeys(json)).toEqual([]);
  });

  it("covers starter kits without addresses or signing secrets and keeps the 094 migration unapplied here", () => {
    expect(existsSync(resolve(process.cwd(), "supabase/migrations", EVM_WALLET_MIGRATION_PLAN.file))).toBe(true);
    expect(readdirSync(resolve(process.cwd(), "supabase/migrations")).filter((name) => name.startsWith("094_"))).toEqual([
      "094_evm_wallet_control_bindings.sql",
    ]);
    const sql = readFileSync(resolve(process.cwd(), "supabase/migrations", EVM_WALLET_MIGRATION_PLAN.file), "utf8");
    expect(sql).toContain("enable row level security");
    expect(sql).not.toMatch(/wallet_address text|signature text|private_key text/i);
    expect(EVM_WALLET_MIGRATION_PLAN.never_auto_apply_from_vercel).toBe(true);

    const validated = validateStarterKitInput({
      pack_id: "age_21_retail",
      path: "evm_partner_adapter",
      runtime: "typescript_nextjs",
      capabilities: [],
    });
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;
    const kit = generateStarterKit(validated.selection);
    expect(kit.ok).toBe(true);
    if (!kit.ok) return;
    const blob = kit.files.map((file) => file.contents).join("\n");
    expect(blob).toContain("personal_sign");
    expect(blob).toContain("Sign this message to prove control for this one action");
    expect(blob).not.toMatch(/window\.ethereum|getBalance|sendTransaction/i);
    expect(resolveEvmWalletBindingForAction).toBeTypeOf("function");
  });
});
