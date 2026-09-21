import { beforeEach, describe, expect, it, vi } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { recoverTypedDataAddress } from "viem";
import { readFileSync } from "node:fs";
import { join } from "node:path";

if (!process.env.NEXTAUTH_SECRET?.trim()) process.env.NEXTAUTH_SECRET = "chain-attestation-test-secret";

vi.mock("@/lib/supabase/admin", async () => {
  const { requireWalletStandardTestAdmin } = await import("@/lib/partner/walletStandard/fakeDurableBackend");
  return { requireSupabaseAdmin: requireWalletStandardTestAdmin };
});

import { AbraxasPartnerKit } from "@/lib/partner/integrationKit";
import { evmFixtureReceipt, EVM_REF_PARTNER_ID, EVM_REF_POLICY_ID } from "@/lib/partner/evm/fixtures";
import { resetFakeWalletStandardBackend } from "@/lib/partner/walletStandard/fakeDurableBackend";
import { getNetworkCapability } from "@/lib/partner/networkCapability/registry";
import {
  CHAIN_ATTESTATION_FORBIDDEN_KEYS,
  EIP712_DOMAIN_NAME,
  EIP712_DOMAIN_VERSION,
  EIP712_PRIMARY_TYPE,
  SOLANA_ATTESTATION_MESSAGE_PREFIX,
} from "@/lib/partner/chainAttestation/contract";
import { issueChainEligibilityAttestation } from "@/lib/partner/chainAttestation/issue";
import { eip712TypedData } from "@/lib/partner/chainAttestation/eip712";
import { verifyEvmEligibilityOffchain } from "@/lib/partner/chainAttestation/evmKit";
import {
  buildSolanaEd25519VerifyInstructionData,
  encodeSolanaEligibilityMessage,
} from "@/lib/partner/chainAttestation/solanaMessage";
import { hashAction, hashNetworkId, hashPartnerId, hashPolicy, hashEnvironment } from "@/lib/partner/chainAttestation/hashes";
import { parseChainAttestationRequest } from "@/lib/partner/chainAttestation/parseRequest";
import { EVM_ATTESTATION_KEY_ENV, EVM_ATTESTATION_KEY_ID_ENV } from "@/lib/partner/chainAttestation/signer";
import { generateStarterKit } from "@/lib/partner/starterKit/generate";
import { validateStarterKitInput } from "@/lib/partner/starterKit/validate";
import { studioSnippetForPath } from "@/lib/partner/integrationStudio";

const VERIFYING = "0x1111111111111111111111111111111111111111" as const;

function kit(environment: "sandbox" | "production" = "sandbox") {
  return new AbraxasPartnerKit({
    partnerId: EVM_REF_PARTNER_ID,
    policyId: EVM_REF_POLICY_ID,
    policyVersion: 1,
    requirePolicyVersion: true,
    environment,
  });
}

function installSigner(pk?: `0x${string}`) {
  const key = pk ?? generatePrivateKey();
  process.env[EVM_ATTESTATION_KEY_ENV] = key;
  process.env[EVM_ATTESTATION_KEY_ID_ENV] = "evm-attestation-test-1";
  return privateKeyToAccount(key);
}

describe("chain eligibility attestations", () => {
  beforeEach(() => {
    resetFakeWalletStandardBackend();
    delete process.env[EVM_ATTESTATION_KEY_ENV];
    delete process.env[EVM_ATTESTATION_KEY_ID_ENV];
  });

  it("issues a valid EIP-712 attestation and rejects domain mismatches", async () => {
    const account = installSigner();
    const adapterKit = kit();
    vi.spyOn(adapterKit, "verifyReceiptId").mockImplementation(async () =>
      adapterKit.evaluateFetchedReceipt(evmFixtureReceipt("approved")),
    );
    const issued = await issueChainEligibilityAttestation({
      kit: adapterKit,
      receiptId: "dr_evm_fixture",
      action_type: "enable_protocol_access",
      action_scope: "sandbox:protocol_access",
      network_id: "evm_sandbox",
      chainId: 11155111,
      verifyingContract: VERIFYING,
    });
    expect(issued.ok).toBe(true);
    if (!issued.ok) return;
    expect(issued.encoding).toBe("eip712");
    expect(issued.typed_data?.domain.name).toBe(EIP712_DOMAIN_NAME);
    expect(issued.typed_data?.domain.version).toBe(EIP712_DOMAIN_VERSION);
    expect(issued.typed_data?.primaryType).toBe(EIP712_PRIMARY_TYPE);
    expect(issued.signature).toMatch(/^0x[0-9a-fA-F]{130,}$/);
    const recovered = await recoverTypedDataAddress({
      ...issued.typed_data!,
      signature: issued.signature!,
    } as never);
    expect(recovered.toLowerCase()).toBe(account.address.toLowerCase());

    const expected = {
      partnerHash: hashPartnerId(EVM_REF_PARTNER_ID),
      policyHash: hashPolicy(EVM_REF_POLICY_ID, 1),
      actionHash: hashAction("enable_protocol_access", "sandbox:protocol_access"),
      networkId: hashNetworkId("evm_sandbox"),
      environment: hashEnvironment("sandbox"),
      requireSubject: false,
    };
    const ok = await verifyEvmEligibilityOffchain({
      domain: issued.typed_data!.domain,
      fields: issued.fields,
      signature: issued.signature!,
      trustedSigner: account.address,
      expected,
      nowSeconds: issued.fields.issuedAt,
      seenNonces: new Set(),
    });
    expect(ok).toEqual({ ok: true, authorized: true });

    const wrongChain = await verifyEvmEligibilityOffchain({
      domain: { ...issued.typed_data!.domain, chainId: 1 },
      fields: issued.fields,
      signature: issued.signature!,
      trustedSigner: account.address,
      expected,
      nowSeconds: issued.fields.issuedAt,
      seenNonces: new Set(),
    });
    expect(wrongChain.ok).toBe(false);

    const wrongContract = await verifyEvmEligibilityOffchain({
      domain: { ...issued.typed_data!.domain, verifyingContract: "0x2222222222222222222222222222222222222222" },
      fields: issued.fields,
      signature: issued.signature!,
      trustedSigner: account.address,
      expected,
      nowSeconds: issued.fields.issuedAt,
      seenNonces: new Set(),
    });
    expect(wrongContract.ok).toBe(false);
  });

  it("fails closed without a dedicated EVM signing key and does not reuse receipt keys", async () => {
    const adapterKit = kit();
    vi.spyOn(adapterKit, "verifyReceiptId").mockImplementation(async () =>
      adapterKit.evaluateFetchedReceipt(evmFixtureReceipt("approved")),
    );
    const missing = await issueChainEligibilityAttestation({
      kit: adapterKit,
      receiptId: "dr_evm_fixture",
      action_type: "enable_protocol_access",
      action_scope: "sandbox:protocol_access",
      network_id: "evm_sandbox",
      chainId: 11155111,
      verifyingContract: VERIFYING,
    });
    expect(missing.ok).toBe(false);
    if (missing.ok) return;
    expect(missing.reason).toBe("attestation_unavailable");
    expect(JSON.stringify(missing.client)).not.toMatch(/private_key|0x[a-fA-F0-9]{64}/);
  });

  it("enforces Arc/EVM registry posture", async () => {
    installSigner();
    const sandboxKit = kit("sandbox");
    vi.spyOn(sandboxKit, "verifyReceiptId").mockImplementation(async () =>
      sandboxKit.evaluateFetchedReceipt(evmFixtureReceipt("approved")),
    );
    expect(getNetworkCapability("arc_circle_mainnet")?.status).toBe("disabled");
    expect(getNetworkCapability("evm_mainnet")?.status).toBe("production_review_required");
    const arc = await issueChainEligibilityAttestation({
      kit: sandboxKit,
      receiptId: "dr_evm_fixture",
      action_type: "enable_protocol_access",
      action_scope: "sandbox:protocol_access",
      network_id: "arc_circle_mainnet",
      chainId: 1,
      verifyingContract: VERIFYING,
    });
    expect(arc.ok).toBe(false);
    const mainnet = await issueChainEligibilityAttestation({
      kit: sandboxKit,
      receiptId: "dr_evm_fixture",
      action_type: "enable_protocol_access",
      action_scope: "sandbox:protocol_access",
      network_id: "evm_mainnet",
      chainId: 1,
      verifyingContract: VERIFYING,
    });
    expect(mainnet.ok).toBe(false);
    if (!mainnet.ok) expect(mainnet.reason).toBe("production_review_required");
  });

  it("rejects partner/policy/action mismatch, expiry, replay, and missing required binding", async () => {
    const account = installSigner();
    const adapterKit = kit();
    vi.spyOn(adapterKit, "verifyReceiptId").mockImplementation(async () =>
      adapterKit.evaluateFetchedReceipt(evmFixtureReceipt("approved")),
    );
    const scopeMismatch = await issueChainEligibilityAttestation({
      kit: adapterKit,
      receiptId: "dr_evm_fixture",
      action_type: "enable_protocol_access",
      action_scope: "sandbox:member_access",
      network_id: "evm_sandbox",
      chainId: 11155111,
      verifyingContract: VERIFYING,
    });
    expect(scopeMismatch.ok).toBe(false);

    const required = await issueChainEligibilityAttestation({
      kit: adapterKit,
      receiptId: "dr_evm_fixture",
      action_type: "enable_protocol_access",
      action_scope: "sandbox:protocol_access",
      network_id: "evm_sandbox",
      chainId: 11155111,
      verifyingContract: VERIFYING,
      wallet_binding_mode: "required",
    });
    expect(required.ok).toBe(false);
    if (!required.ok) expect(required.reason).toBe("wallet_binding_missing");

    const issued = await issueChainEligibilityAttestation({
      kit: adapterKit,
      receiptId: "dr_evm_fixture",
      action_type: "enable_protocol_access",
      action_scope: "sandbox:protocol_access",
      network_id: "evm_sandbox",
      chainId: 11155111,
      verifyingContract: VERIFYING,
    });
    expect(issued.ok).toBe(true);
    if (!issued.ok) return;
    const expected = {
      partnerHash: issued.fields.partnerHash,
      policyHash: issued.fields.policyHash,
      actionHash: issued.fields.actionHash,
      networkId: issued.fields.networkId,
      environment: issued.fields.environment,
      requireSubject: false,
    };
    const seen = new Set<string>();
    const first = await verifyEvmEligibilityOffchain({
      domain: issued.typed_data!.domain,
      fields: issued.fields,
      signature: issued.signature!,
      trustedSigner: account.address,
      expected,
      nowSeconds: issued.fields.issuedAt,
      seenNonces: seen,
    });
    expect(first.ok).toBe(true);
    const replay = await verifyEvmEligibilityOffchain({
      domain: issued.typed_data!.domain,
      fields: issued.fields,
      signature: issued.signature!,
      trustedSigner: account.address,
      expected,
      nowSeconds: issued.fields.issuedAt,
      seenNonces: seen,
    });
    expect(replay).toEqual({ ok: false, reason: "replayed" });
    const expired = await verifyEvmEligibilityOffchain({
      domain: issued.typed_data!.domain,
      fields: issued.fields,
      signature: issued.signature!,
      trustedSigner: account.address,
      expected,
      nowSeconds: issued.fields.expiresAt + 1,
      seenNonces: new Set(),
    });
    expect(expired).toEqual({ ok: false, reason: "expired" });
    const unknown = await verifyEvmEligibilityOffchain({
      domain: issued.typed_data!.domain,
      fields: issued.fields,
      signature: issued.signature!,
      trustedSigner: "0x3333333333333333333333333333333333333333",
      expected,
      nowSeconds: issued.fields.issuedAt,
      seenNonces: new Set(),
    });
    expect(unknown.ok).toBe(false);
  });

  it("encodes a deterministic Solana message and instruction without transfers", async () => {
    const adapterKit = kit();
    vi.spyOn(adapterKit, "verifyReceiptId").mockImplementation(async () =>
      adapterKit.evaluateFetchedReceipt(evmFixtureReceipt("approved")),
    );
    const issued = await issueChainEligibilityAttestation({
      kit: adapterKit,
      receiptId: "dr_evm_fixture",
      action_type: "partner_protocol_action",
      action_scope: "sandbox:partner_protocol",
      network_id: "solana_devnet",
    });
    expect(issued.ok).toBe(true);
    if (!issued.ok) return;
    const a = encodeSolanaEligibilityMessage(issued.fields);
    const b = encodeSolanaEligibilityMessage(issued.fields);
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
    expect(new TextDecoder().decode(a.slice(0, SOLANA_ATTESTATION_MESSAGE_PREFIX.length))).toBe(
      SOLANA_ATTESTATION_MESSAGE_PREFIX,
    );
    const ix = buildSolanaEd25519VerifyInstructionData({
      publicKey: new Uint8Array(32).fill(1),
      signature: new Uint8Array(64).fill(2),
      message: a,
    });
    expect(ix.instructionData[0]).toBe(1);
    expect(ix.messageDataSize).toBe(a.length);
    expect(JSON.stringify(issued.client)).not.toMatch(/transfer|lamports|createTransaction/i);
  });

  it("rejects client override keys and keeps forbidden material out of projections", () => {
    const parsed = parseChainAttestationRequest({
      receipt_id: "dr_x",
      action_type: "enable_protocol_access",
      action_scope: "sandbox:protocol_access",
      network_id: "evm_sandbox",
      private_key: "nope",
    });
    expect(parsed.ok).toBe(false);
    for (const key of CHAIN_ATTESTATION_FORBIDDEN_KEYS) {
      expect(key).not.toMatch(/schemaVersion/);
    }
  });

  it("ships starter kit and docs for the onchain protocol gate", () => {
    const validated = validateStarterKitInput({
      pack_id: "age_21_retail",
      path: "onchain_protocol_gate",
      runtime: "universal_https",
      capabilities: [],
    });
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;
    const kitResult = generateStarterKit(validated.selection);
    expect(kitResult.ok).toBe(true);
    if (!kitResult.ok) return;
    const names = kitResult.files.map((file) => file.path);
    expect(names).toContain("onchain/EVM_VERIFIER.md");
    expect(names).toContain("onchain/SOLANA_PROGRAM.md");
    const blob = kitResult.files.map((file) => file.contents).join("\n");
    expect(blob).toContain("not a payment");
    expect(blob).not.toMatch(/createTransfer|sendTransaction|confirm_testnet_transfer/);
    const snippet = studioSnippetForPath("onchain_protocol_gate");
    expect(snippet.docs).toBe("/docs/chain-verifiable-attestations");
    const docs = readFileSync(join(process.cwd(), "app/docs/chain-verifiable-attestations/page.tsx"), "utf8");
    expect(docs).toContain("AbraxasEligibilityVerifier");
    expect(docs).not.toMatch(/is live on (Arc|Ethereum|Mainnet)/i);
  });
});
