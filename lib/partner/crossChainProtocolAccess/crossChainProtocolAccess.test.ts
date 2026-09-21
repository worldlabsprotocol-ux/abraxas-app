import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { AbraxasPartnerKit } from "@/lib/partner/integrationKit/client";
import {
  createPresentationRequest,
  completePresentationHolderResultForTests,
  issueEligibilityPresentation,
  putSourceReceiptForTests,
  resetEligibilityPresentationsForTests,
  resetSourceReceiptsForTests,
} from "@/lib/eligibilityPresentation";
import { issueCrossChainProtocolAccess, crossChainPayloadLeaks, hasCrossChainClientOverride } from "./issue";
import {
  CROSS_CHAIN_PROTOCOL_ACTION,
  CROSS_CHAIN_PROTOCOL_EVM_INTERFACE,
  CROSS_CHAIN_PROTOCOL_REVOCATION_NOTICE,
  CROSS_CHAIN_PROTOCOL_SOLANA_INTERFACE,
} from "./contract";
import { studioPublicCatalog, studioSnippetForPath } from "@/lib/partner/integrationStudio";
import { generateStarterKit } from "@/lib/partner/starterKit/generate";
import { validateStarterKitInput } from "@/lib/partner/starterKit/validate";
import { STARTER_KIT_VERSION } from "@/lib/partner/starterKit/contract";
import { ONCHAIN_DEPLOYMENT_TEST_ADAPTER_ENV } from "@/lib/partner/onchainGateDeployments/contract";
import { EVM_ATTESTATION_KEY_ENV, EVM_ATTESTATION_KEY_ID_ENV } from "@/lib/partner/chainAttestation/signer";
import { SOLANA_ATTESTATION_KEY_ENV, SOLANA_ATTESTATION_KEY_ID_ENV } from "@/lib/partner/chainAttestation/solanaSigner";
import { resetFakeWalletStandardBackend } from "@/lib/partner/walletStandard/fakeDurableBackend";
import { hashAction } from "@/lib/partner/chainAttestation/hashes";

if (!process.env.NEXTAUTH_SECRET?.trim()) process.env.NEXTAUTH_SECRET = "cross-chain-protocol-test-secret";
process.env.VITEST = "1";

const KEY = generateTestSigningKeyPair();
process.env.ABRAXAS_SIGNING_KEY_ID = KEY.signingKeyId;
process.env.ABRAXAS_PUBLIC_KEY = JSON.stringify(KEY.publicKeyJwk);
process.env.ABRAXAS_SIGNING_KEY = JSON.stringify(KEY.privateKeyJwk);

vi.mock("@/lib/supabase/admin", async () => {
  const { requireWalletStandardTestAdmin } = await import("@/lib/partner/walletStandard/fakeDurableBackend");
  return { requireSupabaseAdmin: requireWalletStandardTestAdmin };
});

const PARTNER = "acme";
const POLICY = "acme-age_21_retail-v1";

function receipt(overrides: Partial<DecisionReceiptRecord> = {}): DecisionReceiptRecord {
  return {
    id: "dr_ep_1",
    schema_version: "1.0.0",
    verification_decision_id: "dec-ep-1",
    consent_receipt_id: "cr_ep_1",
    policy_id: POLICY,
    policy_version: 1,
    partner_id: PARTNER,
    subject_pseudonym_id: "ps_ep",
    wallet_binding_ref: null,
    decision_result: "approved",
    reason_codes: ["eligible"],
    evaluated_claim_refs: [],
    issuer_refs: [],
    decision_context: "sandbox_only",
    evaluated_at: "2026-09-21T00:00:00.000Z",
    expires_at: "2099-01-01T00:00:00.000Z",
    status: "active",
    payload_hash: "hash",
    signature: "sig",
    signing_key_id: KEY.signingKeyId,
    anchor_reference: null,
    revoked_at: null,
    idempotency_key: null,
    created_at: "2026-09-21T00:00:00.000Z",
    ...overrides,
  };
}

function publicFrom(record: DecisionReceiptRecord) {
  return {
    receipt_id: record.id,
    schema_version: "1.0.0",
    partner_id: record.partner_id,
    policy_id: record.policy_id,
    policy_version: record.policy_version,
    decision_result: record.decision_result,
    signature_valid: true,
    expires_at: record.expires_at,
    status: record.status,
    production_usable: false,
    decision_context: "sandbox_only",
    currently_valid: record.decision_result === "approved" && record.status === "active",
    invalidation_reasons: [],
    artifact_type: "eligibility_decision_receipt",
  };
}

function kit(fetchImpl: (url: string) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>) {
  return new AbraxasPartnerKit({
    partnerId: PARTNER,
    policyId: POLICY,
    policyVersion: 1,
    requirePolicyVersion: true,
    environment: "sandbox",
    fetchFn: ((url: string) => fetchImpl(String(url))) as typeof fetch,
  });
}

const requestBody = {
  policy_id: POLICY,
  policy_version: 1,
  purpose: "Confirm adult retail eligibility",
  action: "retail_access",
  action_scope: "sandbox:protocol_access",
  environment: "sandbox" as const,
  result_category: "age_21",
  verifier_nonce: "nonce-cross-chain-alpha",
};

async function issuedEnvelope() {
  const created = await createPresentationRequest({ ...requestBody, partnerId: PARTNER });
  const record = receipt();
  putSourceReceiptForTests(record);
  await completePresentationHolderResultForTests({ requestRef: created.request_ref, receipt: record, partnerId: PARTNER });
  const envelope = await issueEligibilityPresentation({
    partnerId: PARTNER,
    request_ref: created.request_ref,
    verifier_nonce: requestBody.verifier_nonce,
  });
  return { envelope, record };
}

describe("cross-chain protocol access", () => {
  beforeEach(() => {
    resetEligibilityPresentationsForTests();
    resetSourceReceiptsForTests();
    resetFakeWalletStandardBackend();
    process.env[ONCHAIN_DEPLOYMENT_TEST_ADAPTER_ENV] = "1";
    const pk = generatePrivateKey();
    process.env[EVM_ATTESTATION_KEY_ENV] = pk;
    process.env[EVM_ATTESTATION_KEY_ID_ENV] = "evm-attestation-test-1";
    privateKeyToAccount(pk);
    delete process.env[SOLANA_ATTESTATION_KEY_ENV];
    delete process.env[SOLANA_ATTESTATION_KEY_ID_ENV];
  });

  afterEach(() => {
    delete process.env[ONCHAIN_DEPLOYMENT_TEST_ADAPTER_ENV];
  });

  it("issues EVM activate_protocol_access after presentation and receipt re-fetch", async () => {
    const { envelope, record } = await issuedEnvelope();
    let fetches = 0;
    const client = kit(async () => {
      fetches += 1;
      return { ok: true, status: 200, json: async () => publicFrom(record) };
    });
    const result = await issueCrossChainProtocolAccess({
      kit: client,
      envelope,
      expected: {
        verifier_nonce: requestBody.verifier_nonce,
        policy_id: POLICY,
        policy_version: 1,
        action: "retail_access",
        environment: "sandbox",
      },
      network_id: "evm_sandbox",
      deployment_ref: "dep_local_sandbox",
      wallet_binding_hash: "0x".padEnd(66, "a"),
      wallet_binding_mode: "required",
      testAdapter: {
        source: "local_anvil",
        chainId: 31337,
        verifyingContract: "0x1111111111111111111111111111111111111111",
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.presentation_sufficient).toBe(false);
    expect(result.encoding).toBe("eip712");
    expect(result.client.presentation_sufficient).toBe(false);
    expect(fetches).toBeGreaterThanOrEqual(2);
    expect(result.fields?.actionHash).toBe(hashAction(CROSS_CHAIN_PROTOCOL_ACTION, "sandbox:protocol_access"));
    expect(crossChainPayloadLeaks(result.client)).toEqual([]);
  });

  it("issues Solana activate_protocol_access after presentation and receipt re-fetch", async () => {
    const { envelope, record } = await issuedEnvelope();
    process.env[SOLANA_ATTESTATION_KEY_ENV] = "11".repeat(32);
    process.env[SOLANA_ATTESTATION_KEY_ID_ENV] = "solana-attestation-test-1";
    const client = kit(async () => ({ ok: true, status: 200, json: async () => publicFrom(record) }));
    const result = await issueCrossChainProtocolAccess({
      kit: client,
      envelope,
      expected: {
        verifier_nonce: requestBody.verifier_nonce,
        policy_id: POLICY,
        policy_version: 1,
        action: "retail_access",
        environment: "sandbox",
      },
      network_id: "solana_devnet",
      deployment_ref: "dep_local_solana",
      wallet_binding_hash: "opaque-subject",
      wallet_binding_mode: "required",
      testAdapter: {
        source: "solana_program_test",
        programId: "11111111111111111111111111111111",
        gateConfigPda: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.encoding).toBe("solana");
    expect(result.presentation_sufficient).toBe(false);
  });

  it("fails closed without a second public receipt fetch", async () => {
    const { envelope, record } = await issuedEnvelope();
    let fetches = 0;
    const client = kit(async () => {
      fetches += 1;
      if (fetches === 1) return { ok: true, status: 200, json: async () => publicFrom(record) };
      return { ok: false, status: 404, json: async () => ({}) };
    });
    const result = await issueCrossChainProtocolAccess({
      kit: client,
      envelope,
      expected: {
        verifier_nonce: requestBody.verifier_nonce,
        policy_id: POLICY,
        policy_version: 1,
        action: "retail_access",
        environment: "sandbox",
      },
      network_id: "evm_sandbox",
      deployment_ref: "dep_local_sandbox",
      wallet_binding_hash: "0x".padEnd(66, "b"),
      wallet_binding_mode: "required",
      testAdapter: {
        source: "local_anvil",
        chainId: 31337,
        verifyingContract: "0x1111111111111111111111111111111111111111",
      },
    });
    expect(result.ok).toBe(false);
    expect(result.presentation_sufficient).toBe(false);
  });

  it("blocks new issuance after receipt revocation on re-fetch", async () => {
    const { envelope, record } = await issuedEnvelope();
    let fetches = 0;
    const client = kit(async () => {
      fetches += 1;
      if (fetches === 1) return { ok: true, status: 200, json: async () => publicFrom(record) };
      return {
        ok: true,
        status: 200,
        json: async () => publicFrom({ ...record, status: "revoked", revoked_at: "2026-09-21T01:00:00.000Z", decision_result: "approved" }),
      };
    });
    const result = await issueCrossChainProtocolAccess({
      kit: client,
      envelope,
      expected: {
        verifier_nonce: requestBody.verifier_nonce,
        policy_id: POLICY,
        policy_version: 1,
        action: "retail_access",
        environment: "sandbox",
      },
      network_id: "evm_sandbox",
      deployment_ref: "dep_local_sandbox",
      wallet_binding_hash: "0x".padEnd(66, "d"),
      wallet_binding_mode: "required",
      testAdapter: {
        source: "local_anvil",
        chainId: 31337,
        verifyingContract: "0x1111111111111111111111111111111111111111",
      },
    });
    expect(result.ok).toBe(false);
    expect(result.presentation_sufficient).toBe(false);
    expect(fetches).toBeGreaterThanOrEqual(2);
  });

  it("rejects wrong audience, policy, action, and environment", async () => {
    const { envelope, record } = await issuedEnvelope();
    const client = kit(async () => ({ ok: true, status: 200, json: async () => publicFrom(record) }));
    const base = {
      kit: client,
      envelope,
      network_id: "evm_sandbox",
      deployment_ref: "dep_local_sandbox",
      wallet_binding_hash: "0x".padEnd(66, "c"),
      wallet_binding_mode: "required" as const,
      testAdapter: {
        source: "local_anvil" as const,
        chainId: 31337,
        verifyingContract: "0x1111111111111111111111111111111111111111" as `0x${string}`,
      },
    };
    expect((await issueCrossChainProtocolAccess({
      ...base,
      expected: {
        verifier_nonce: requestBody.verifier_nonce,
        policy_id: "other-policy",
        policy_version: 1,
        action: "retail_access",
        environment: "sandbox",
      },
    })).ok).toBe(false);
    expect((await issueCrossChainProtocolAccess({
      ...base,
      expected: {
        verifier_nonce: requestBody.verifier_nonce,
        policy_id: POLICY,
        policy_version: 1,
        action: "other_action",
        environment: "sandbox",
      },
    })).ok).toBe(false);
    expect((await issueCrossChainProtocolAccess({
      ...base,
      expected: {
        verifier_nonce: requestBody.verifier_nonce,
        policy_id: POLICY,
        policy_version: 1,
        action: "retail_access",
        environment: "production",
      },
    })).ok).toBe(false);
  });

  it("rejects browser override keys and leaks", () => {
    expect(hasCrossChainClientOverride({ receipt_id: "dr_x", chain: "evm" })).toBe(true);
    expect(crossChainPayloadLeaks({ allowed: false, reason: "invalid", evidence: "nope" })).toContain("evidence");
  });

  it("exposes Studio, starter kit, docs, and interfaces without funds claims", () => {
    expect(CROSS_CHAIN_PROTOCOL_EVM_INTERFACE.method).toBe("activateProtocolAccess");
    expect(CROSS_CHAIN_PROTOCOL_SOLANA_INTERFACE.instruction).toBe("activate_protocol_access");
    const snippet = studioSnippetForPath("cross_chain_protocol_access");
    expect(snippet.title).toBe("Build a cross-chain protocol gate");
    expect(snippet.code).toContain("activateProtocolAccess");
    expect(snippet.code).not.toMatch(/createTransfer|USDC|utila/i);
    const catalog = studioPublicCatalog({ pathId: "cross_chain_protocol_access" });
    expect(catalog.cross_chain_protocol_access.funds_movement).toBe(false);
    expect(catalog.cross_chain_protocol_access.presentation_sufficient).toBe(false);
    expect(STARTER_KIT_VERSION).toBe("1.13.0");
    const validated = validateStarterKitInput({
      pack_id: "age_21_retail",
      path: "cross_chain_protocol_access",
      runtime: "universal_https",
    });
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;
    const kitZip = generateStarterKit(validated.selection);
    expect(kitZip.ok).toBe(true);
    if (!kitZip.ok) return;
    expect(kitZip.files.some((file) => file.path.includes("cross-chain-protocol-access"))).toBe(true);
    const docs = readFileSync(join(process.cwd(), "app/docs/cross-chain-protocol-access/page.tsx"), "utf8");
    expect(docs).toContain("private proof");
    expect(docs).toContain("valid_until");
    expect(docs).toContain("CROSS_CHAIN_PROTOCOL_REVOCATION_NOTICE");
    expect(docs.toLowerCase()).not.toMatch(/live mainnet deployment/);
    expect(CROSS_CHAIN_PROTOCOL_REVOCATION_NOTICE).toContain("short-lived");
    expect(CROSS_CHAIN_PROTOCOL_REVOCATION_NOTICE).toContain("not an indefinite KYC");
    expect(hasCrossChainClientOverride({ expiry: "2099-01-01" })).toBe(true);
    expect(readFileSync(join(process.cwd(), "examples/cross-chain-protocol-access/README.md"), "utf8")).toContain("local / sandbox");
  });
});
