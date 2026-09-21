import { beforeEach, describe, expect, it, vi } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextRequest } from "next/server";

if (!process.env.NEXTAUTH_SECRET?.trim()) process.env.NEXTAUTH_SECRET = "chain-attestation-signer-test";

vi.mock("@/lib/supabase/admin", async () => {
  const { requireWalletStandardTestAdmin } = await import("@/lib/partner/walletStandard/fakeDurableBackend");
  return { requireSupabaseAdmin: requireWalletStandardTestAdmin };
});

import {
  fakeWalletInserts,
  resetFakeWalletStandardBackend,
  requireWalletStandardTestAdmin,
} from "@/lib/partner/walletStandard/fakeDurableBackend";
import { resetWebhookExtendedEventTypeProbeCache } from "@/lib/partner/eventDelivery/schemaCapability";
import { AbraxasPartnerKit } from "@/lib/partner/integrationKit";
import { evmFixtureReceipt, EVM_REF_PARTNER_ID, EVM_REF_POLICY_ID } from "@/lib/partner/evm/fixtures";
import { issueChainEligibilityAttestation } from "@/lib/partner/chainAttestation/issue";
import { EVM_ATTESTATION_KEY_ENV, EVM_ATTESTATION_KEY_ID_ENV } from "@/lib/partner/chainAttestation/signer";
import { SOLANA_ATTESTATION_KEY_ENV, SOLANA_ATTESTATION_KEY_ID_ENV } from "@/lib/partner/chainAttestation/solanaSigner";
import { ONCHAIN_DEPLOYMENT_TEST_ADAPTER_ENV } from "@/lib/partner/onchainGateDeployments/contract";
import {
  hashesForApplication,
  expectedEvmConfigDigest,
  registerOnchainGateDeployment,
  setLocalAnvilFixture,
  resetOnchainVerificationFixtures,
} from "@/lib/partner/onchainGateDeployments";
import { updateDeploymentStatus } from "@/lib/partner/onchainGateDeployments/store";
import {
  CHAIN_ATTESTATION_SIGNER_REGISTRY_ENV,
  assertNoPrivateAttestationSignerMaterial,
  buildChainAttestationSignerDocument,
  createSignerUpdatePackages,
  loadChainAttestationSignerRegistry,
  resolveChainAttestationIssuanceSigner,
  resolveChainAttestationVerificationSigner,
  serializeSignerUpdatePackage,
} from "@/lib/partner/chainAttestationSignerLifecycle";
import { GET as evmKeys } from "@/app/api/chain-attestations/verification-keys/evm/route";
import { GET as solanaKeys } from "@/app/api/chain-attestations/verification-keys/solana/route";
import { generateStarterKit } from "@/lib/partner/starterKit/generate";
import { validateStarterKitInput } from "@/lib/partner/starterKit/validate";
import { ABRAXAS_PARTNER_ELIGIBILITY_GATE_ABI, EVM_GATE_ENTRY_POINTS } from "@/lib/partner/evmGate/abi";

const GATE = "0x1111111111111111111111111111111111111111" as const;
const BYTECODE = (`0x${"ab".repeat(32)}`) as `0x${string}`;

function kit() {
  return new AbraxasPartnerKit({
    partnerId: EVM_REF_PARTNER_ID,
    policyId: EVM_REF_POLICY_ID,
    policyVersion: 1,
    requirePolicyVersion: true,
    environment: "sandbox",
  });
}

function installEvm() {
  const key = generatePrivateKey();
  process.env[EVM_ATTESTATION_KEY_ENV] = key;
  process.env[EVM_ATTESTATION_KEY_ID_ENV] = "evm-attestation-test-1";
  return privateKeyToAccount(key);
}

describe("chain attestation signer lifecycle", () => {
  beforeEach(() => {
    resetFakeWalletStandardBackend();
    resetOnchainVerificationFixtures();
    resetWebhookExtendedEventTypeProbeCache();
    delete process.env[CHAIN_ATTESTATION_SIGNER_REGISTRY_ENV];
    delete process.env[EVM_ATTESTATION_KEY_ENV];
    delete process.env[EVM_ATTESTATION_KEY_ID_ENV];
    delete process.env[SOLANA_ATTESTATION_KEY_ENV];
    delete process.env[SOLANA_ATTESTATION_KEY_ID_ENV];
    process.env[ONCHAIN_DEPLOYMENT_TEST_ADAPTER_ENV] = "1";
  });

  it("issues only with an active in-window signer", async () => {
    const account = installEvm();
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
      testAdapter: { source: "local_anvil", chainId: 31337, verifyingContract: GATE },
    });
    expect(issued.ok).toBe(true);
    const resolved = resolveChainAttestationIssuanceSigner({
      algorithm: "secp256k1",
      environment: "sandbox",
      networkId: "evm_sandbox",
      gateType: "evm",
      schemaVersion: "1",
    });
    expect(resolved.ok).toBe(true);
    if (resolved.ok) expect(resolved.key.public_verifier).toBe(account.address.toLowerCase());
  });

  it("lets retiring keys verify historically but not issue", () => {
    const account = installEvm();
    process.env[CHAIN_ATTESTATION_SIGNER_REGISTRY_ENV] = JSON.stringify([{
      key_id: "evm-attestation-test-1",
      algorithm: "secp256k1",
      environment: "sandbox",
      public_verifier: account.address,
      allowed_networks: ["evm_sandbox"],
      allowed_gate_types: ["evm"],
      schema_versions: ["1"],
      status: "retiring",
      reason_class: "rotation",
      allow_historical_verification: true,
      historical_verify_until: "2099-01-01T00:00:00.000Z",
      not_before: "2020-01-01T00:00:00.000Z",
    }]);
    expect(resolveChainAttestationIssuanceSigner({
      algorithm: "secp256k1",
      environment: "sandbox",
      networkId: "evm_sandbox",
      gateType: "evm",
      schemaVersion: "1",
    }).ok).toBe(false);
    const verified = resolveChainAttestationVerificationSigner({
      keyId: "evm-attestation-test-1",
      algorithm: "secp256k1",
      environment: "sandbox",
      networkId: "evm_sandbox",
      gateType: "evm",
      schemaVersion: "1",
    });
    expect(verified.ok).toBe(true);
  });

  it("fails closed for revoked, unknown, wrong environment, network, and schema", () => {
    const account = installEvm();
    process.env[CHAIN_ATTESTATION_SIGNER_REGISTRY_ENV] = JSON.stringify([{
      key_id: "evm-attestation-test-1",
      algorithm: "secp256k1",
      environment: "sandbox",
      public_verifier: account.address,
      allowed_networks: ["evm_sandbox"],
      allowed_gate_types: ["evm"],
      schema_versions: ["1"],
      status: "revoked",
      reason_class: "compromise",
    }]);
    expect(resolveChainAttestationVerificationSigner({
      keyId: "evm-attestation-test-1",
      algorithm: "secp256k1",
      environment: "sandbox",
      networkId: "evm_sandbox",
      gateType: "evm",
      schemaVersion: "1",
    }).ok).toBe(false);
    expect(resolveChainAttestationVerificationSigner({
      keyId: "missing",
      algorithm: "secp256k1",
      environment: "sandbox",
      networkId: "evm_sandbox",
      gateType: "evm",
      schemaVersion: "1",
    })).toMatchObject({ ok: false, reason: "unknown_key" });
    process.env[CHAIN_ATTESTATION_SIGNER_REGISTRY_ENV] = JSON.stringify([{
      key_id: "scoped",
      algorithm: "secp256k1",
      environment: "production",
      public_verifier: account.address,
      allowed_networks: ["evm_mainnet"],
      allowed_gate_types: ["evm"],
      schema_versions: ["2"],
      status: "active",
    }]);
    expect(resolveChainAttestationVerificationSigner({
      keyId: "scoped",
      algorithm: "secp256k1",
      environment: "sandbox",
      networkId: "evm_sandbox",
      gateType: "evm",
      schemaVersion: "1",
    })).toMatchObject({ ok: false, reason: "wrong_environment" });
    process.env[CHAIN_ATTESTATION_SIGNER_REGISTRY_ENV] = JSON.stringify([{
      key_id: "scoped",
      algorithm: "secp256k1",
      environment: "sandbox",
      public_verifier: account.address,
      allowed_networks: ["evm_mainnet"],
      allowed_gate_types: ["evm"],
      schema_versions: ["1"],
      status: "active",
    }]);
    expect(resolveChainAttestationVerificationSigner({
      keyId: "scoped",
      algorithm: "secp256k1",
      environment: "sandbox",
      networkId: "evm_sandbox",
      gateType: "evm",
      schemaVersion: "1",
    })).toMatchObject({ ok: false, reason: "wrong_network" });
    process.env[CHAIN_ATTESTATION_SIGNER_REGISTRY_ENV] = JSON.stringify([{
      key_id: "scoped",
      algorithm: "secp256k1",
      environment: "sandbox",
      public_verifier: account.address,
      allowed_networks: ["evm_sandbox"],
      allowed_gate_types: ["evm"],
      schema_versions: ["9"],
      status: "active",
    }]);
    expect(resolveChainAttestationVerificationSigner({
      keyId: "scoped",
      algorithm: "secp256k1",
      environment: "sandbox",
      networkId: "evm_sandbox",
      gateType: "evm",
      schemaVersion: "1",
    })).toMatchObject({ ok: false, reason: "schema_mismatch" });
  });

  it("blocks issuance when the verified deployment needs a signer update", async () => {
    delete process.env[ONCHAIN_DEPLOYMENT_TEST_ADAPTER_ENV];
    installEvm();
    const hashes = hashesForApplication({
      partnerId: EVM_REF_PARTNER_ID,
      policyId: EVM_REF_POLICY_ID,
      policyVersion: 1,
      actionType: "enable_protocol_access",
      actionScope: "sandbox:protocol_access",
      environment: "sandbox",
      signerKeyId: "evm-attestation-test-1",
    });
    const config_digest = expectedEvmConfigDigest({
      chainId: 31337,
      gateAddress: GATE,
      partnerHash: hashes.partner_hash,
      policyHash: hashes.policy_hash,
      actionHash: hashes.action_hash,
      environment: hashes.environment_hash,
      signerKeyId: "evm-attestation-test-1",
      subjectBindingMode: "optional",
    });
    setLocalAnvilFixture(GATE, { codeHash: BYTECODE, configDigest: config_digest });
    const registered = await registerOnchainGateDeployment({
      partnerId: EVM_REF_PARTNER_ID,
      applicationId: "app-signer",
      policyId: EVM_REF_POLICY_ID,
      policyVersion: 1,
      appEnvironment: "sandbox",
      manifest: {
        schema_version: 1,
        gate_type: "evm",
        network_id: "evm_sandbox",
        chain_id: 31337,
        gate_address: GATE,
        bytecode_hash: BYTECODE,
        config_digest,
        partner_hash: hashes.partner_hash,
        policy_hash: hashes.policy_hash,
        action_hash: hashes.action_hash,
        action_type: "enable_protocol_access",
        action_scope: "sandbox:protocol_access",
        environment: "sandbox",
        signer_key_id: "evm-attestation-test-1",
        subject_binding_mode: "optional",
      },
    });
    expect(registered.ok).toBe(true);
    if (!registered.ok) return;
    await updateDeploymentStatus({
      deploymentRef: registered.record.deployment_ref,
      partnerId: EVM_REF_PARTNER_ID,
      status: "signer_update_required",
    });
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
      application_id: "app-signer",
      deployment_ref: registered.record.deployment_ref,
    });
    expect(issued.ok).toBe(false);
    if (!issued.ok) expect(issued.reason).toBe("signer_update_required");
  });

  it("serializes a safe update package and enqueues a lifecycle webhook", async () => {
    const account = installEvm();
    await requireWalletStandardTestAdmin().from("partner_webhook_configs").insert({
      partner_id: EVM_REF_PARTNER_ID,
      enabled: true,
    });
    await requireWalletStandardTestAdmin().from("onchain_gate_deployments").insert({
      deployment_ref: "ogd_testsigner1",
      partner_id: EVM_REF_PARTNER_ID,
      application_id: "app-signer",
      gate_type: "evm",
      network_id: "evm_sandbox",
      signer_key_id: "evm-attestation-test-1",
      status: "verified_sandbox",
    });
    const loaded = loadChainAttestationSignerRegistry();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const packages = await createSignerUpdatePackages({
      signer: loaded.keys[0],
      toStatus: "retiring",
      requiredKeys: loaded.keys,
    });
    expect(packages[0]?.status).toBe("signer_update_required");
    expect(packages[0]?.broadcasts).toBe(false);
    expect(assertNoPrivateAttestationSignerMaterial(serializeSignerUpdatePackage(packages[0]!))).toEqual([]);
    expect(JSON.stringify(packages)).not.toMatch(/private_key|mnemonic|seed phrase/i);
    expect(fakeWalletInserts.some((row) => row.table === "partner_webhook_outbox")).toBe(true);
    expect(fakeWalletInserts.some((row) => row.table === "chain_attestation_signer_updates")).toBe(true);
    expect(account.address.startsWith("0x")).toBe(true);
  });

  it("never returns private signer material on public endpoints", async () => {
    installEvm();
    const req = new NextRequest("http://localhost/api/chain-attestations/verification-keys/evm");
    const res = await evmKeys(req);
    const body = await res.json();
    expect(assertNoPrivateAttestationSignerMaterial(body)).toEqual([]);
    expect(JSON.stringify(body)).not.toMatch(/private_key|ABRAXAS_EVM_ATTESTATION_PRIVATE_KEY/i);
    const sol = await solanaKeys(new NextRequest("http://localhost/api/chain-attestations/verification-keys/solana"));
    expect(assertNoPrivateAttestationSignerMaterial(await sol.json())).toEqual([]);
    expect(buildChainAttestationSignerDocument({ algorithm: "secp256k1" })).not.toHaveProperty("ok");
  });

  it("ships docs, starter kit, ABI rotation entry points, and DEMO-first SQL without side effects", () => {
    expect(EVM_GATE_ENTRY_POINTS).toEqual(expect.arrayContaining([
      "addTrustedSigner",
      "retireTrustedSigner",
      "revokeTrustedSigner",
    ]));
    expect(EVM_GATE_ENTRY_POINTS).not.toContain("setTrustedSigner");
    expect(JSON.stringify(ABRAXAS_PARTNER_ELIGIBILITY_GATE_ABI)).not.toMatch(/delegatecall|transferFrom|approve/);
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/103_chain_attestation_signer_lifecycle.sql"), "utf8");
    expect(sql).toContain("DEMO-first");
    expect(sql).toContain("chain_attestation_signers_env_algo_key_uq");
    expect(sql).toContain("service_role");
    expect(sql).not.toMatch(/private_key|rpc_url|broadcast/i);
    const sol = readFileSync(join(process.cwd(), "solana/abraxas-eligibility-gate/programs/abraxas-eligibility-gate/src/lib.rs"), "utf8");
    expect(sol).toContain("add_trusted_signer");
    expect(sol).toContain("retire_trusted_signer");
    expect(sol).toContain("revoke_trusted_signer");
    expect(sol).not.toMatch(/invoke_signed|spl_token|upgrade_authority/);
    const evm = readFileSync(join(process.cwd(), "contracts/evm-eligibility-verifier/src/AbraxasPartnerEligibilityGate.sol"), "utf8");
    expect(evm).toContain("addTrustedSigner");
    expect(evm).not.toMatch(/delegatecall|transferFrom/);
    const validated = validateStarterKitInput({
      pack_id: "age_21_retail",
      path: "evm_onchain_eligibility_gate",
      platform: "evm_contract",
      capabilities: [],
    });
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;
    const kitResult = generateStarterKit(validated.selection);
    expect(kitResult.ok).toBe(true);
    if (!kitResult.ok) return;
    expect(kitResult.files.map((file) => file.path)).toContain("onchain/SIGNER_LIFECYCLE.md");
    expect(kitResult.files.find((file) => file.path === "onchain/SIGNER_LIFECYCLE.md")!.contents).not.toMatch(/broadcast/i);
    const docs = readFileSync(join(process.cwd(), "app/docs/chain-attestation-signer-lifecycle/page.tsx"), "utf8");
    expect(docs).toContain("cannot be recovered");
    expect(docs).not.toMatch(/USDC transfer|Mainnet deployment/i);
  });
});
