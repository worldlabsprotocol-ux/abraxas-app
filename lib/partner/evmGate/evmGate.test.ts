import { describe, expect, it, beforeEach, vi } from "vitest";
import { concatHex, keccak256, toHex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { getCreate2Address } from "viem";
import { AbraxasPartnerKit } from "@/lib/partner/integrationKit";
import { evmFixtureReceipt, EVM_REF_PARTNER_ID, EVM_REF_POLICY_ID } from "@/lib/partner/evm/fixtures";
import { resetFakeWalletStandardBackend } from "@/lib/partner/walletStandard/fakeDurableBackend";
import { issueChainEligibilityAttestation } from "@/lib/partner/chainAttestation/issue";
import { verifyEvmEligibilityOffchain } from "@/lib/partner/chainAttestation/evmKit";
import { EVM_ATTESTATION_KEY_ENV, EVM_ATTESTATION_KEY_ID_ENV } from "@/lib/partner/chainAttestation/signer";
import { hashAction, hashEnvironment, hashNetworkId, hashPartnerId, hashPolicy } from "@/lib/partner/chainAttestation/hashes";
import { encodeConsumeEligibilityCall, encodeRecordNamedActionCall } from "./encode";
import { hashEvmGateBytecode, projectEvmGateManifest, rejectEvmGateClientAuthority, validateEvmGateManifest } from "./validate";
import { evaluateEvmGateReadiness, registerEvmGateManifest } from "./readiness";
import { EVM_GATE_ENTRY_POINTS, EVM_GATE_FORBIDDEN_METHODS } from "./abi";
import { encodeGateConfigArgs, predictEvmGateCreate2Address } from "./create2";
import { EVM_GATE_NETWORK_POSTURES, getEvmGateNetworkPosture } from "./networks";
import { EVM_GATE_MANIFEST_FIELDS } from "./manifest";

if (!process.env.NEXTAUTH_SECRET?.trim()) process.env.NEXTAUTH_SECRET = "evm-gate-test-secret";

vi.mock("@/lib/supabase/admin", async () => {
  const { requireWalletStandardTestAdmin } = await import("@/lib/partner/walletStandard/fakeDurableBackend");
  return { requireSupabaseAdmin: requireWalletStandardTestAdmin };
});

const ZERO32 = `0x${"11".repeat(32)}` as const;
const GATE = "0x1111111111111111111111111111111111111111" as const;

function sampleManifest(overrides: Record<string, unknown> = {}) {
  return {
    schema_version: 1,
    status: "local_test",
    network_id: "evm_sandbox",
    chain_id: 31337,
    gate_address: GATE,
    bytecode_hash: ZERO32,
    partner_hash: ZERO32,
    policy_hash: ZERO32,
    action_hash: ZERO32,
    environment: ZERO32,
    signer_key_id: "evm-attestation-test-1",
    require_subject: false,
    create2_salt: null,
    predicted_address: null,
    ...overrides,
  };
}

describe("partner-owned EVM eligibility gate kit", () => {
  beforeEach(() => {
    resetFakeWalletStandardBackend();
    delete process.env[EVM_ATTESTATION_KEY_ENV];
    delete process.env[EVM_ATTESTATION_KEY_ID_ENV];
  });

  it("validates manifests, bytecode hashes, and CREATE2 without inferring live", () => {
    const parsed = validateEvmGateManifest(sampleManifest());
    expect(parsed.ok).toBe(true);
    expect(EVM_GATE_MANIFEST_FIELDS).toContain("bytecode_hash");
    expect(hashEvmGateBytecode("0x6080604052")).toMatch(/^0x[0-9a-f]+$/);
    const salt = `0x${"ab".repeat(32)}` as const;
    const init = "0x6000" as const;
    const predicted = predictEvmGateCreate2Address({
      deployer: GATE,
      salt,
      initCode: init,
    });
    expect(predicted).toBe(getCreate2Address({ from: GATE, salt, bytecodeHash: keccak256(init) }));
    expect(encodeGateConfigArgs({
      trustedSigner: GATE,
      partnerHash: ZERO32,
      networkId: ZERO32,
      policyHash: ZERO32,
      actionHash: ZERO32,
      environment: ZERO32,
      requireSubjectBinding: false,
    }).startsWith("0x")).toBe(true);
    expect(projectEvmGateManifest((parsed as { ok: true; manifest: never }).manifest as never)).not.toHaveProperty("live");
    expect(validateEvmGateManifest({ ...sampleManifest(), live: true }).ok).toBe(false);
    expect(validateEvmGateManifest({ ...sampleManifest(), status: "live" }).ok).toBe(false);
    expect(validateEvmGateManifest({ ...sampleManifest(), rpc_url: "http://x" }).ok).toBe(false);
    expect(validateEvmGateManifest({ ...sampleManifest(), network_id: "arc_circle_mainnet", status: "partner_deployed", chain_id: 1 }).ok).toBe(false);
  });

  it("encodes consumeEligibility from a server-shaped EIP-712 attestation", async () => {
    const key = generatePrivateKey();
    process.env[EVM_ATTESTATION_KEY_ENV] = key;
    process.env[EVM_ATTESTATION_KEY_ID_ENV] = "evm-attestation-test-1";
    const account = privateKeyToAccount(key);
    const kit = new AbraxasPartnerKit({
      partnerId: EVM_REF_PARTNER_ID,
      policyId: EVM_REF_POLICY_ID,
      policyVersion: 1,
      requirePolicyVersion: true,
      environment: "sandbox",
    });
    vi.spyOn(kit, "verifyReceiptId").mockImplementation(async () => kit.evaluateFetchedReceipt(evmFixtureReceipt("approved")));
    const issued = await issueChainEligibilityAttestation({
      kit,
      receiptId: "dr_evm_fixture",
      action_type: "enable_protocol_access",
      action_scope: "sandbox:protocol_access",
      network_id: "evm_sandbox",
      chainId: 31337,
      verifyingContract: GATE,
    });
    expect(issued.ok).toBe(true);
    if (!issued.ok) return;
    const expected = {
      partnerHash: hashPartnerId(EVM_REF_PARTNER_ID),
      policyHash: hashPolicy(EVM_REF_POLICY_ID, 1),
      actionHash: hashAction("enable_protocol_access", "sandbox:protocol_access"),
      networkId: hashNetworkId("evm_sandbox"),
      environment: hashEnvironment("sandbox"),
      requireSubject: false,
    };
    const offchain = await verifyEvmEligibilityOffchain({
      domain: issued.typed_data!.domain,
      fields: issued.fields,
      signature: issued.signature!,
      trustedSigner: account.address,
      expected,
      nowSeconds: issued.fields.issuedAt,
      seenNonces: new Set(),
    });
    expect(offchain).toEqual({ ok: true, authorized: true });
    const data = encodeConsumeEligibilityCall({ fields: issued.fields, signature: issued.signature! });
    expect(data.startsWith("0x")).toBe(true);
    expect(data.length).toBeGreaterThan(10);
    const consumer = encodeRecordNamedActionCall({ fields: issued.fields, signature: issued.signature! });
    expect(consumer.startsWith("0x")).toBe(true);
    expect(JSON.stringify(issued.client)).not.toMatch(/receipt|evidence|private_key/i);
    expect(EVM_GATE_ENTRY_POINTS).toContain("consumeEligibility");
    expect(EVM_GATE_FORBIDDEN_METHODS).toContain("transfer");
    expect(concatHex([data]).length).toBeGreaterThan(2);
  });

  it("rejects Launchpad client authority and enforces network posture", () => {
    expect(rejectEvmGateClientAuthority({ gate_address: GATE })).toBe(true);
    expect(evaluateEvmGateReadiness({}).state).toBe("not_configured");
    expect(evaluateEvmGateReadiness({ clientBody: { chain_id: 1 } }).reason).toBe("client_override_rejected");
    const local = registerEvmGateManifest({ manifest: sampleManifest() });
    expect(local.ok).toBe(true);
    if (!local.ok) return;
    expect(local.state).toBe("local_test_ready");
    const review = registerEvmGateManifest({
      manifest: sampleManifest({ status: "partner_deployed", network_id: "evm_mainnet", chain_id: 1 }),
    });
    expect(review.ok).toBe(true);
    if (!review.ok) return;
    expect(review.state).toBe("production_review_required");
    expect(registerEvmGateManifest({ manifest: sampleManifest(), clientBody: { nonce: "x" } }).ok).toBe(false);
    const arc = getEvmGateNetworkPosture("arc_circle_testnet");
    expect(arc?.future_compatible).toBe(true);
    expect(arc?.deployable).toBe(false);
    expect(arc?.live).toBe(false);
    expect(arc?.circle_settlement).toBe(false);
    expect(getEvmGateNetworkPosture("arc_circle_mainnet")?.registry_status).toBe("disabled");
    expect(EVM_GATE_NETWORK_POSTURES.every((row) => row.live === false)).toBe(true);
  });
});
