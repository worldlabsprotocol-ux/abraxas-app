import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

if (!process.env.NEXTAUTH_SECRET?.trim()) process.env.NEXTAUTH_SECRET = "evm-partner-adapter-test-secret";

vi.mock("@/lib/supabase/admin", async () => {
  const { requireWalletStandardTestAdmin } = await import("@/lib/partner/walletStandard/fakeDurableBackend");
  return { requireSupabaseAdmin: requireWalletStandardTestAdmin };
});

import {
  AbraxasEvmPartnerAdapter,
  EVM_LIVE_INTEGRATION_REQUIREMENTS,
  EVM_NO_EXECUTION_BOUNDARY,
  EVM_NOT_A_CHAIN_PRODUCT,
  EVM_PARTNER_ACTION_TYPES,
  EVM_PARTNER_CLIENT_VISIBLE_KEYS,
  EVM_REF_PARTNER_ID,
  EVM_REF_POLICY_ID,
  EVM_WALLET_BINDING_OUT_OF_SCOPE,
  assertNoSensitiveEvmClientKeys,
  evmFixtureReceipt,
  rejectEvmClientOverride,
} from "@/lib/partner/evm";
import { evaluateNetworkAction, getNetworkCapability } from "@/lib/partner/networkCapability";
import { generateStarterKit } from "@/lib/partner/starterKit/generate";
import { validateStarterKitInput } from "@/lib/partner/starterKit/validate";
import { studioSnippetForPath } from "@/lib/partner/integrationStudio";
import { resetFakeWalletStandardBackend } from "@/lib/partner/walletStandard/fakeDurableBackend";

function adapter(environment: "sandbox" | "production" = "sandbox", partnerId = EVM_REF_PARTNER_ID) {
  return new AbraxasEvmPartnerAdapter({
    partnerId,
    policyId: EVM_REF_POLICY_ID,
    policyVersion: 1,
    environment,
  });
}

function contractFor(
  client: AbraxasEvmPartnerAdapter,
  action: (typeof EVM_PARTNER_ACTION_TYPES)[number] = "enable_protocol_access",
) {
  const issued = client.issueActionContract({
    action_type: action,
    action_scope:
      action === "enable_protocol_access"
        ? "sandbox:protocol_access"
        : action === "enable_member_access"
          ? "sandbox:member_access"
          : "sandbox:redemption_access",
  });
  if ("ok" in issued) throw new Error("expected contract");
  return issued;
}

describe("Abraxas EVM partner eligibility adapter", () => {
  beforeEach(() => {
    resetFakeWalletStandardBackend();
  });

  it("permits an approved sandbox receipt for each named EVM action", async () => {
    const client = adapter();
    const result = client.evaluateFetchedReceipt(evmFixtureReceipt("approved"));
    for (const action of EVM_PARTNER_ACTION_TYPES) {
      const contract = contractFor(client, action);
      const bound = await client.preflight({ result, contract });
      expect(bound.allowed).toBe(true);
      expect(bound.reason).toBe("permitted");
      expect(bound.action_binding.action_type).toBe(action);
      expect(bound.action_binding.nonce_state).toBe("consumed");
      expect(bound.action_binding.wallet_binding).toBe("not_attached");
      expect(Object.keys(bound).sort()).toEqual([...EVM_PARTNER_CLIENT_VISIBLE_KEYS].sort());
      expect(assertNoSensitiveEvmClientKeys(bound)).toEqual([]);
    }
  });

  it("rejects wrong partner, policy, version, action, and scope", async () => {
    const client = adapter();
    const result = client.evaluateFetchedReceipt(evmFixtureReceipt("approved"));
    const contract = contractFor(client);
    expect((await client.preflight({ result, contract, action_type: "transferFrom" })).reason).toBe("action_mismatch");
    expect((await client.preflight({ result, contract, action_scope: "live:any_method" })).reason).toBe("action_mismatch");
    expect(client.issueActionContract({ action_type: "place_order" })).toEqual({
      ok: false,
      reason: "action_mismatch",
    });
    expect(client.issueActionContract({
      action_type: "enable_protocol_access",
      action_scope: "sandbox:member_access",
    })).toEqual({ ok: false, reason: "action_mismatch" });

    const other = adapter("sandbox", "partner-other-tenant");
    const stolen = await other.preflight({ result, contract });
    expect(stolen.allowed).toBe(false);
    expect(stolen.reason).toBe("partner_mismatch");

    const versioned = new AbraxasEvmPartnerAdapter({
      partnerId: EVM_REF_PARTNER_ID,
      policyId: EVM_REF_POLICY_ID,
      policyVersion: 9,
      environment: "sandbox",
    });
    const versionMismatch = await versioned.preflight({ result, contract: contractFor(client) });
    expect(versionMismatch.reason).toBe("policy_mismatch");
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
        result: client.evaluateFetchedReceipt(evmFixtureReceipt(fixture)),
        contract: contractFor(client),
      });
      expect(bound.allowed).toBe(false);
      expect(bound.reason).toBe(reason);
      expect(assertNoSensitiveEvmClientKeys(bound)).toEqual([]);
    }
    const result = client.evaluateFetchedReceipt(evmFixtureReceipt("approved"));
    const contract = contractFor(client);
    expect((await client.preflight({ result, contract })).allowed).toBe(true);
    const replay = await client.preflight({ result, contract });
    expect(replay.allowed).toBe(false);
    expect(replay.reason).toBe("replayed");
  });

  it("keeps sandbox distinct from Mainnet and requires Production review", async () => {
    expect(getNetworkCapability("evm_sandbox")?.status).toBe("configured");
    expect(getNetworkCapability("evm_mainnet")?.status).toBe("production_review_required");
    expect(getNetworkCapability("evm_mainnet")?.environment).toBe("mainnet");
    expect(evaluateNetworkAction({
      networkId: "evm_mainnet",
      context: {
        productionAccessApproved: true,
        kitEnvironment: "production",
        receiptCurrentlyValid: true,
        durableReplaySatisfied: true,
        partnerExecutionIntegration: true,
        actionType: "enable_protocol_access",
      },
    })).toMatchObject({ ok: false, reason: "production_review_required" });

    const prod = adapter("production");
    const issued = prod.issueActionContract({
      action_type: "enable_protocol_access",
      action_scope: "sandbox:protocol_access",
      network_id: "evm_mainnet",
    });
    if ("ok" in issued) throw new Error("expected issued mainnet contract");
    const blocked = await prod.preflight({
      result: prod.evaluateFetchedReceipt(evmFixtureReceipt("approved")),
      contract: issued,
    });
    expect(blocked.allowed).toBe(false);

    const sandbox = adapter();
    const mix = await sandbox.preflight({
      result: sandbox.evaluateFetchedReceipt(evmFixtureReceipt("approved")),
      contract: issued,
    });
    expect(mix.allowed).toBe(false);
    expect(mix.reason).toBe("environment_mismatch");
  });

  it("rejects client chain, contract, wallet, and transaction overrides", async () => {
    const client = adapter();
    const result = client.evaluateFetchedReceipt(evmFixtureReceipt("approved"));
    const contract = contractFor(client);
    expect(rejectEvmClientOverride({ chain_id: 1 })).toBe(true);
    expect(rejectEvmClientOverride({ calldata: "0x" })).toBe(true);
    expect(rejectEvmClientOverride({ wallet_address: "0xabc" })).toBe(true);
    expect(rejectEvmClientOverride({ transaction: {} })).toBe(true);
    const forged = await client.preflight({
      result,
      contract: {
        ...contract,
        chain_id: 1,
        rpc_url: "https://example.invalid",
        wallet_address: "0xabc",
      } as typeof contract,
    });
    expect(forged.allowed).toBe(false);
    expect(["invalid", "action_mismatch"]).toContain(forged.reason);
    expect(client.issueActionContract({
      action_type: "enable_protocol_access",
      calldata: "0xdead",
    } as { action_type: string })).toEqual({ ok: false, reason: "action_mismatch" });
  });

  it("isolates tenants and never leaks sensitive output", async () => {
    const home = adapter();
    const other = adapter("sandbox", "partner-other-tenant");
    const contract = contractFor(home);
    const stolen = await other.preflight({
      result: home.evaluateFetchedReceipt(evmFixtureReceipt("approved")),
      contract,
    });
    expect(stolen.reason).toBe("partner_mismatch");
    expect(assertNoSensitiveEvmClientKeys(stolen)).toEqual([]);
    expect(JSON.stringify(stolen)).not.toMatch(/rpc|private_key|wallet_address|calldata/i);
  });

  it("never calls RPC, wallets, transactions, or fund movement", () => {
    const src = readFileSync(join(__dirname, "adapter.ts"), "utf8");
    expect(src).not.toMatch(/ethers|viem|web3|JsonRpc|sendTransaction|signTransaction|walletconnect|window\.ethereum/i);
    expect(adapter().createsTransactions).toBe(false);
    expect(adapter().fundsMovement).toBe(false);
    expect(adapter().connectsWallet).toBe(false);
    expect(adapter().callsRpc).toBe(false);
    expect(adapter().constructsTransactions).toBe(false);
    expect(adapter().submitsTransactions).toBe(false);
    expect(EVM_NO_EXECUTION_BOUNDARY.toLowerCase()).toContain("never a transaction approval");
    expect(EVM_NOT_A_CHAIN_PRODUCT.toLowerCase()).toContain("not a wallet");
    expect(EVM_WALLET_BINDING_OUT_OF_SCOPE.toLowerCase()).toContain("out of scope");
    expect(EVM_LIVE_INTEGRATION_REQUIREMENTS.join(" ")).toContain("partner-owned EVM execution");
  });

  it("covers Integration Studio and Starter Kits without RPC secrets", () => {
    const snippet = studioSnippetForPath("evm_partner_adapter");
    expect(snippet.code).toContain("AbraxasEvmPartnerAdapter");
    expect(snippet.code).toContain("enable_protocol_access");
    expect(snippet.code).toContain("PARTNER EXECUTION BELONGS HERE");
    expect(snippet.code).not.toMatch(/https?:\/\/.*rpc|INFURA|ALCHEMY|privateKey|window\.ethereum/i);
    expect(snippet.docs).toBe("/docs/evm-partner-adapter");

    for (const runtime of ["universal_https", "typescript_nextjs", "typescript_express", "javascript_wix_velo", "typescript_serverless"] as const) {
      const validated = validateStarterKitInput({
        pack_id: "age_21_retail",
        path: "evm_partner_adapter",
        runtime,
        capabilities: [],
      });
      expect(validated.ok, runtime).toBe(true);
      if (!validated.ok) continue;
      const kit = generateStarterKit(validated.selection);
      expect(kit.ok, runtime).toBe(true);
      if (!kit.ok) continue;
      const blob = kit.files.map((file) => file.contents).join("\n");
      expect(blob).toContain("enable_protocol_access");
      expect(blob).toMatch(/PARTNER EXECUTION BELONGS HERE|partner execution belongs here/i);
      expect(blob).not.toMatch(/infura|alchemy|privateKey|window\.ethereum|sendTransaction/i);
    }
  });
});
