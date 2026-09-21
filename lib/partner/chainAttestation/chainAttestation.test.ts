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
  CHAIN_ATTESTATION_CLIENT_VISIBLE_KEYS,
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
import {
  chainAttestationHasForbiddenKeys,
  projectChainAttestationClient,
} from "@/lib/partner/chainAttestation/project";
import { EVM_ATTESTATION_KEY_ENV, EVM_ATTESTATION_KEY_ID_ENV } from "@/lib/partner/chainAttestation/signer";
import { SOLANA_ATTESTATION_KEY_ENV, SOLANA_ATTESTATION_KEY_ID_ENV } from "@/lib/partner/chainAttestation/solanaSigner";
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
    delete process.env[SOLANA_ATTESTATION_KEY_ENV];
    delete process.env[SOLANA_ATTESTATION_KEY_ID_ENV];
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
    process.env[SOLANA_ATTESTATION_KEY_ENV] = "03".repeat(32);
    process.env[SOLANA_ATTESTATION_KEY_ID_ENV] = "solana-attestation-test-1";
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
    expect(issued.solana_signature).toMatch(/^0x[0-9a-f]+$/);
    expect(issued.fields.signerKeyId).not.toContain("unsigned");
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

  it("projects only the client-visible allowlist in order and keeps forbidden detection separate", () => {
    const view = {
      allowed: true,
      reason: "permitted" as const,
      action_binding: {
        action_type: "enable_protocol_access",
        action_scope: "sandbox:protocol_access",
        nonce_state: "issued" as const,
        wallet_binding: "optional" as const,
      },
      expires_at: "2099-01-01T00:00:00.000Z",
      schema_version: 1 as const,
      network_id: "evm_sandbox",
      environment: "sandbox" as const,
    };
    const projected = projectChainAttestationClient(view);
    expect(Object.keys(projected)).toEqual([...CHAIN_ATTESTATION_CLIENT_VISIBLE_KEYS]);
    expect(projected.allowed).toBe(true);
    expect(projected.reason).toBe("permitted");
    expect(projected.action_binding).toEqual(view.action_binding);
    expect(projected.expires_at).toBe(view.expires_at);
    expect(projected.schema_version).toBe(1);
    expect(projected.network_id).toBe("evm_sandbox");
    expect(projected.environment).toBe("sandbox");

    const unsanitized = {
      ...view,
      private_key: "secret",
      signing_key: "secret",
      receipt: {},
      receipt_id: "dr_secret",
      claims: [],
      evidence: [],
      source_facts: [],
      wallet_private_key: "0xabc",
      wallet_address: "0x1111111111111111111111111111111111111111",
      provider: "alchemy",
      api_key: "abx_test_x",
      calldata: "0xdead",
      recipient: "0x2222222222222222222222222222222222222222",
      amount: "1",
      transaction: {},
      tx: "0x",
    };
    expect(chainAttestationHasForbiddenKeys(unsanitized).length).toBeGreaterThan(0);
    expect(chainAttestationHasForbiddenKeys(projected)).toEqual([]);
    const projectedKeys = Object.keys(projected);
    for (const key of [
      "private_key",
      "signing_key",
      "receipt",
      "receipt_id",
      "claims",
      "evidence",
      "source_facts",
      "wallet_private_key",
      "wallet_address",
      "provider",
      "api_key",
      "calldata",
      "recipient",
      "amount",
      "transaction",
      "tx",
      "signature",
      "typed_data",
    ]) {
      expect(projectedKeys).not.toContain(key);
    }
    const source = readFileSync(join(process.cwd(), "lib/partner/chainAttestation/project.ts"), "utf8");
    expect(source).not.toMatch(/as unknown as/);
    expect(source).not.toContain("pickAllowedKeys");
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

  it("fails closed when the dedicated Solana attestation signer is missing", async () => {
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
    expect(issued.ok).toBe(false);
    if (issued.ok) return;
    expect(issued.reason).toBe("attestation_unavailable");
  });

  it("ships starter kit and docs for the Solana onchain eligibility gate", () => {
    const validated = validateStarterKitInput({
      pack_id: "age_21_retail",
      path: "solana_onchain_eligibility_gate",
      platform: "solana_program",
      capabilities: [],
    });
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;
    const kitResult = generateStarterKit(validated.selection);
    expect(kitResult.ok).toBe(true);
    if (!kitResult.ok) return;
    const names = kitResult.files.map((file) => file.path);
    expect(names).toContain("onchain/SOLANA_PROGRAM.md");
    expect(names).toContain("src/lib/solana-onchain-gate.ts");
    const blob = kitResult.files.map((file) => file.contents).join("\n");
    expect(blob).toContain("cargo test --workspace");
    expect(blob).not.toMatch(/deployed to (devnet|mainnet)/i);
    const snippet = studioSnippetForPath("solana_onchain_eligibility_gate");
    expect(snippet.docs).toBe("/docs/solana-onchain-eligibility-gate");
    const docs = readFileSync(join(process.cwd(), "app/docs/solana-onchain-eligibility-gate/page.tsx"), "utf8");
    expect(docs).toContain("SOLANA_ATTESTATION_MESSAGE_PREFIX");
    expect(docs).not.toMatch(/is live on (devnet|Mainnet)/i);
  });
});
