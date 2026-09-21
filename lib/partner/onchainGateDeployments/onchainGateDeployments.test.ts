import { beforeEach, describe, expect, it, vi } from "vitest";
import { generatePrivateKey } from "viem/accounts";

if (!process.env.NEXTAUTH_SECRET?.trim()) process.env.NEXTAUTH_SECRET = "onchain-gate-deploy-test";

vi.mock("@/lib/supabase/admin", async () => {
  const { requireWalletStandardTestAdmin } = await import("@/lib/partner/walletStandard/fakeDurableBackend");
  return { requireSupabaseAdmin: requireWalletStandardTestAdmin };
});

import { resetFakeWalletStandardBackend } from "@/lib/partner/walletStandard/fakeDurableBackend";
import { EVM_REF_PARTNER_ID, EVM_REF_POLICY_ID, evmFixtureReceipt } from "@/lib/partner/evm/fixtures";
import { hashAction, hashEnvironment, hashPartnerId, hashPolicy } from "@/lib/partner/chainAttestation/hashes";
import { AbraxasPartnerKit } from "@/lib/partner/integrationKit";
import { issueChainEligibilityAttestation } from "@/lib/partner/chainAttestation/issue";
import { parseChainAttestationRequest } from "@/lib/partner/chainAttestation/parseRequest";
import { EVM_ATTESTATION_KEY_ENV, EVM_ATTESTATION_KEY_ID_ENV } from "@/lib/partner/chainAttestation/signer";
import { SOLANA_ATTESTATION_KEY_ENV, SOLANA_ATTESTATION_KEY_ID_ENV } from "@/lib/partner/chainAttestation/solanaSigner";
import {
  approveProductionDeployment,
  expectedEvmConfigDigest,
  expectedSolanaConfigDigest,
  hashesForApplication,
  onchainGatePayloadLeaks,
  parseOnchainDeploymentManifest,
  registerOnchainGateDeployment,
  resetOnchainVerificationFixtures,
  revokeOnchainGateDeployment,
  setLocalAnvilFixture,
  setLocalSolanaProgramTestFixture,
} from "@/lib/partner/onchainGateDeployments";
import { getDeploymentByRef } from "@/lib/partner/onchainGateDeployments/store";
import { ONCHAIN_DEPLOYMENT_TEST_ADAPTER_ENV } from "@/lib/partner/onchainGateDeployments/contract";
import { generateStarterKit } from "@/lib/partner/starterKit/generate";
import { validateStarterKitInput } from "@/lib/partner/starterKit/validate";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const GATE = "0x1111111111111111111111111111111111111111" as const;
const BYTECODE = (`0x${"ab".repeat(32)}`) as `0x${string}`;
const PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const PDA = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";

function evmManifest(overrides: Record<string, unknown> = {}) {
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
  return {
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
    ...overrides,
  };
}

function solanaManifest(overrides: Record<string, unknown> = {}) {
  const hashes = hashesForApplication({
    partnerId: EVM_REF_PARTNER_ID,
    policyId: EVM_REF_POLICY_ID,
    policyVersion: 1,
    actionType: "partner_protocol_action",
    actionScope: "sandbox:partner_protocol",
    environment: "sandbox",
    signerKeyId: "solana-attestation-test-1",
  });
  const program_digest = (`0x${"cd".repeat(32)}`) as `0x${string}`;
  const config_digest = expectedSolanaConfigDigest({
    programId: PROGRAM,
    gateConfigPda: PDA,
    programDigest: program_digest,
    partnerHash: hashes.partner_hash,
    policyHash: hashes.policy_hash,
    actionHash: hashes.action_hash,
    environment: hashes.environment_hash,
    signerKeyId: "solana-attestation-test-1",
    subjectBindingMode: "optional",
  });
  return {
    schema_version: 1,
    gate_type: "solana",
    network_id: "solana_devnet",
    program_id: PROGRAM,
    gate_config_pda: PDA,
    program_digest,
    config_digest,
    partner_hash: hashes.partner_hash,
    policy_hash: hashes.policy_hash,
    action_hash: hashes.action_hash,
    action_type: "partner_protocol_action",
    action_scope: "sandbox:partner_protocol",
    environment: "sandbox",
    signer_key_id: "solana-attestation-test-1",
    subject_binding_mode: "optional",
    ...overrides,
  };
}

describe("verified onchain gate deployments", () => {
  beforeEach(() => {
    resetFakeWalletStandardBackend();
    resetOnchainVerificationFixtures();
    delete process.env[ONCHAIN_DEPLOYMENT_TEST_ADAPTER_ENV];
    delete process.env[EVM_ATTESTATION_KEY_ENV];
    delete process.env[EVM_ATTESTATION_KEY_ID_ENV];
    delete process.env[SOLANA_ATTESTATION_KEY_ENV];
    delete process.env[SOLANA_ATTESTATION_KEY_ID_ENV];
    delete process.env.ABRAXAS_EVM_GATE_VERIFY_RPC_URL;
  });

  it("isolates tenant and application records", async () => {
    const manifest = evmManifest();
    setLocalAnvilFixture(GATE, { codeHash: BYTECODE, configDigest: manifest.config_digest as `0x${string}` });
    const ok = await registerOnchainGateDeployment({
      partnerId: EVM_REF_PARTNER_ID,
      applicationId: "app-a",
      policyId: EVM_REF_POLICY_ID,
      policyVersion: 1,
      appEnvironment: "sandbox",
      manifest,
    });
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    const other = await getDeploymentByRef({
      deploymentRef: ok.record.deployment_ref,
      partnerId: "other-tenant",
    });
    expect(other).toBeNull();
    const crossApp = await getDeploymentByRef({
      deploymentRef: ok.record.deployment_ref,
      partnerId: EVM_REF_PARTNER_ID,
      applicationId: "app-b",
    });
    expect(crossApp).toBeNull();
  });

  it("matches and mismatches EVM code and config hashes", async () => {
    const manifest = evmManifest();
    setLocalAnvilFixture(GATE, { codeHash: BYTECODE, configDigest: manifest.config_digest as `0x${string}` });
    const match = await registerOnchainGateDeployment({
      partnerId: EVM_REF_PARTNER_ID,
      applicationId: "app-evm",
      policyId: EVM_REF_POLICY_ID,
      policyVersion: 1,
      appEnvironment: "sandbox",
      manifest,
    });
    expect(match.ok).toBe(true);
    if (match.ok) expect(match.record.status).toBe("verified_sandbox");

    resetOnchainVerificationFixtures();
    setLocalAnvilFixture(GATE, { codeHash: `0x${"11".repeat(32)}`, configDigest: manifest.config_digest as `0x${string}` });
    const codeMiss = await registerOnchainGateDeployment({
      partnerId: EVM_REF_PARTNER_ID,
      applicationId: "app-evm-2",
      policyId: EVM_REF_POLICY_ID,
      policyVersion: 1,
      appEnvironment: "sandbox",
      manifest,
    });
    expect(codeMiss.ok).toBe(false);
    if (!codeMiss.ok) expect(codeMiss.reason).toBe("code_hash_mismatch");

    setLocalAnvilFixture(GATE, { codeHash: BYTECODE, configDigest: `0x${"22".repeat(32)}` });
    const digestMiss = await registerOnchainGateDeployment({
      partnerId: EVM_REF_PARTNER_ID,
      applicationId: "app-evm-3",
      policyId: EVM_REF_POLICY_ID,
      policyVersion: 1,
      appEnvironment: "sandbox",
      manifest,
    });
    expect(digestMiss.ok).toBe(false);
    if (!digestMiss.ok) expect(digestMiss.reason).toBe("config_digest_mismatch");
  });

  it("matches and mismatches Solana program and GateConfig", async () => {
    const manifest = solanaManifest();
    setLocalSolanaProgramTestFixture(PROGRAM, PDA, {
      programId: PROGRAM,
      gateConfigPda: PDA,
      programDigest: manifest.program_digest as `0x${string}`,
      configDigest: manifest.config_digest as `0x${string}`,
    });
    const match = await registerOnchainGateDeployment({
      partnerId: EVM_REF_PARTNER_ID,
      applicationId: "app-sol",
      policyId: EVM_REF_POLICY_ID,
      policyVersion: 1,
      appEnvironment: "sandbox",
      manifest,
    });
    expect(match.ok).toBe(true);

    setLocalSolanaProgramTestFixture(PROGRAM, PDA, {
      programId: "11111111111111111111111111111111",
      gateConfigPda: PDA,
      programDigest: manifest.program_digest as `0x${string}`,
      configDigest: manifest.config_digest as `0x${string}`,
    });
    const miss = await registerOnchainGateDeployment({
      partnerId: EVM_REF_PARTNER_ID,
      applicationId: "app-sol-2",
      policyId: EVM_REF_POLICY_ID,
      policyVersion: 1,
      appEnvironment: "sandbox",
      manifest,
    });
    expect(miss.ok).toBe(false);
    if (!miss.ok) expect(miss.reason).toBe("program_mismatch");
  });

  it("rejects institutional register against a V1-only Solana observation", async () => {
    const manifest = solanaManifest();
    setLocalSolanaProgramTestFixture(PROGRAM, PDA, {
      programId: PROGRAM,
      gateConfigPda: PDA,
      programDigest: manifest.program_digest as `0x${string}`,
      configDigest: manifest.config_digest as `0x${string}`,
      canonicalMessageLen: 372,
      schemaVersion: 1,
      requireInstitutional: false,
      institutionalCapable: false,
    });
    const miss = await registerOnchainGateDeployment({
      partnerId: EVM_REF_PARTNER_ID,
      applicationId: "app-sol-v1",
      policyId: EVM_REF_POLICY_ID,
      policyVersion: 1,
      appEnvironment: "sandbox",
      manifest,
      institutionalRequired: true,
    });
    expect(miss.ok).toBe(false);
    if (!miss.ok) expect(miss.reason).toBe("institutional_required");
  });

  it("fails closed when no RPC adapter is configured", async () => {
    const manifest = evmManifest();
    const none = await registerOnchainGateDeployment({
      partnerId: EVM_REF_PARTNER_ID,
      applicationId: "app-norpc",
      policyId: EVM_REF_POLICY_ID,
      policyVersion: 1,
      appEnvironment: "sandbox",
      manifest,
      forceNoRpc: true,
    });
    expect(none.ok).toBe(false);
    if (!none.ok) expect(none.reason).toBe("deployment_verification_unavailable");
  });

  it("rejects manifest tampering and forbidden keys", () => {
    expect(parseOnchainDeploymentManifest({ ...evmManifest(), extra: true }).ok).toBe(false);
    expect(parseOnchainDeploymentManifest({ ...evmManifest(), rpc_url: "http://evil" }).ok).toBe(false);
    expect(parseChainAttestationRequest({
      receipt_id: "dr",
      action_type: "enable_protocol_access",
      action_scope: "sandbox:protocol_access",
      network_id: "evm_sandbox",
      deployment_ref: "ogd_x",
      verifying_contract: GATE,
    }).ok).toBe(false);
  });

  it("revokes a deployment and blocks issuance", async () => {
    process.env[EVM_ATTESTATION_KEY_ENV] = generatePrivateKey();
    process.env[EVM_ATTESTATION_KEY_ID_ENV] = "evm-attestation-test-1";
    const manifest = evmManifest();
    setLocalAnvilFixture(GATE, { codeHash: BYTECODE, configDigest: manifest.config_digest as `0x${string}` });
    const registered = await registerOnchainGateDeployment({
      partnerId: EVM_REF_PARTNER_ID,
      applicationId: "app-rev",
      policyId: EVM_REF_POLICY_ID,
      policyVersion: 1,
      appEnvironment: "sandbox",
      manifest,
    });
    expect(registered.ok).toBe(true);
    if (!registered.ok) return;
    await revokeOnchainGateDeployment({
      partnerId: EVM_REF_PARTNER_ID,
      applicationId: "app-rev",
      deploymentRef: registered.record.deployment_ref,
    });
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
      deployment_ref: registered.record.deployment_ref,
      application_id: "app-rev",
    });
    expect(issued.ok).toBe(false);
    if (!issued.ok) expect(issued.reason).toBe("deployment_revoked");
  });

  it("requires a verified deployment for chain-bound issuance", async () => {
    process.env[EVM_ATTESTATION_KEY_ENV] = generatePrivateKey();
    process.env[EVM_ATTESTATION_KEY_ID_ENV] = "evm-attestation-test-1";
    const kit = new AbraxasPartnerKit({
      partnerId: EVM_REF_PARTNER_ID,
      policyId: EVM_REF_POLICY_ID,
      policyVersion: 1,
      requirePolicyVersion: true,
      environment: "sandbox",
    });
    vi.spyOn(kit, "verifyReceiptId").mockImplementation(async () => kit.evaluateFetchedReceipt(evmFixtureReceipt("approved")));
    const missing = await issueChainEligibilityAttestation({
      kit,
      receiptId: "dr_evm_fixture",
      action_type: "enable_protocol_access",
      action_scope: "sandbox:protocol_access",
      network_id: "evm_sandbox",
      application_id: "app-iss",
    });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.reason).toBe("deployment_not_verified");

    const manifest = evmManifest();
    setLocalAnvilFixture(GATE, { codeHash: BYTECODE, configDigest: manifest.config_digest as `0x${string}` });
    const registered = await registerOnchainGateDeployment({
      partnerId: EVM_REF_PARTNER_ID,
      applicationId: "app-iss",
      policyId: EVM_REF_POLICY_ID,
      policyVersion: 1,
      appEnvironment: "sandbox",
      manifest,
    });
    expect(registered.ok).toBe(true);
    if (!registered.ok) return;
    const issued = await issueChainEligibilityAttestation({
      kit,
      receiptId: "dr_evm_fixture",
      action_type: "enable_protocol_access",
      action_scope: "sandbox:protocol_access",
      network_id: "evm_sandbox",
      deployment_ref: registered.record.deployment_ref,
      application_id: "app-iss",
    });
    expect(issued.ok).toBe(true);
    if (issued.ok) {
      expect(issued.typed_data?.domain.verifyingContract.toLowerCase()).toBe(GATE);
      expect(issued.typed_data?.domain.chainId).toBe(31337);
    }
  });

  it("enforces network posture and production review", async () => {
    const mainnet = evmManifest({
      network_id: "evm_mainnet",
      chain_id: 1,
      environment: "production",
      config_digest: expectedEvmConfigDigest({
        chainId: 1,
        gateAddress: GATE,
        partnerHash: hashPartnerId(EVM_REF_PARTNER_ID),
        policyHash: hashPolicy(EVM_REF_POLICY_ID, 1),
        actionHash: hashAction("enable_protocol_access", "sandbox:protocol_access"),
        environment: hashEnvironment("production"),
        signerKeyId: "evm-attestation-test-1",
        subjectBindingMode: "optional",
      }),
    });
    setLocalAnvilFixture(GATE, { codeHash: BYTECODE, configDigest: mainnet.config_digest as `0x${string}` });
    const registered = await registerOnchainGateDeployment({
      partnerId: EVM_REF_PARTNER_ID,
      applicationId: "app-prod",
      policyId: EVM_REF_POLICY_ID,
      policyVersion: 1,
      appEnvironment: "production",
      manifest: mainnet,
    });
    expect(registered.ok).toBe(true);
    if (!registered.ok) return;
    expect(registered.record.status).toBe("production_review_required");

    process.env[EVM_ATTESTATION_KEY_ENV] = generatePrivateKey();
    process.env[EVM_ATTESTATION_KEY_ID_ENV] = "evm-attestation-test-1";
    const prodKit = new AbraxasPartnerKit({
      partnerId: EVM_REF_PARTNER_ID,
      policyId: EVM_REF_POLICY_ID,
      policyVersion: 1,
      requirePolicyVersion: true,
      environment: "production",
    });
    vi.spyOn(prodKit, "verifyReceiptId").mockImplementation(async () => prodKit.evaluateFetchedReceipt(evmFixtureReceipt("approved")));
    const blocked = await issueChainEligibilityAttestation({
      kit: prodKit,
      receiptId: "dr_evm_fixture",
      action_type: "enable_protocol_access",
      action_scope: "sandbox:protocol_access",
      network_id: "evm_mainnet",
      deployment_ref: registered.record.deployment_ref,
      application_id: "app-prod",
    });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(["production_review_required", "environment_mismatch"]).toContain(blocked.reason);

    await approveProductionDeployment({ partnerId: EVM_REF_PARTNER_ID, deploymentRef: registered.record.deployment_ref });
    const { bindIssuanceToVerifiedDeployment } = await import("@/lib/partner/onchainGateDeployments/bindIssuance");
    const bound = await bindIssuanceToVerifiedDeployment({
      partnerId: EVM_REF_PARTNER_ID,
      applicationId: "app-prod",
      deploymentRef: registered.record.deployment_ref,
      networkId: "evm_mainnet",
      actionType: "enable_protocol_access",
      actionScope: "sandbox:protocol_access",
      kitEnvironment: "production",
      policyId: EVM_REF_POLICY_ID,
      policyVersion: 1,
      signerKeyId: "evm-attestation-test-1",
    });
    expect(bound.ok).toBe(true);

    const arc = await registerOnchainGateDeployment({
      partnerId: EVM_REF_PARTNER_ID,
      applicationId: "app-arc",
      policyId: EVM_REF_POLICY_ID,
      policyVersion: 1,
      appEnvironment: "sandbox",
      manifest: evmManifest({ network_id: "arc_circle_mainnet", chain_id: 1 }),
    });
    expect(arc.ok).toBe(false);
  });

  it("does not leak secrets or claim deployment, Circle, payment, trade, or Mainnet side effects", async () => {
    const manifest = evmManifest();
    setLocalAnvilFixture(GATE, { codeHash: BYTECODE, configDigest: manifest.config_digest as `0x${string}` });
    const registered = await registerOnchainGateDeployment({
      partnerId: EVM_REF_PARTNER_ID,
      applicationId: "app-leak",
      policyId: EVM_REF_POLICY_ID,
      policyVersion: 1,
      appEnvironment: "sandbox",
      manifest,
    });
    expect(registered.ok).toBe(true);
    if (!registered.ok) return;
    expect(onchainGatePayloadLeaks(registered.public)).toEqual([]);
    expect(registered.public.live).toBe(false);
    expect(registered.public.deploys).toBe(false);
    expect(registered.public.circle_settlement).toBe(false);
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/102_verified_onchain_gate_deployments.sql"), "utf8");
    expect(sql).toContain("DEMO-first");
    expect(sql).toContain("service_role");
    expect(sql).not.toMatch(/rpc_url|private_key|usdc|circle wallet/i);
  });

  it("ships starter kit placeholders and docs without live RPC", () => {
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
    expect(kitResult.files.map((file) => file.path)).toContain("onchain/deployment-manifest.template.json");
    const template = kitResult.files.find((file) => file.path === "onchain/deployment-manifest.template.json")!.contents;
    expect(template).toContain("{{GATE_ADDRESS}}");
    expect(template).not.toMatch(/0x[a-fA-F0-9]{40}/);
    const docs = readFileSync(join(process.cwd(), "app/docs/onchain-gate-deployments/page.tsx"), "utf8");
    expect(docs).toContain("deployment_verification_unavailable");
    expect(docs).not.toMatch(/USDC transfer/i);
  });

  it("treats incomplete Solana observations as V1-only and denies production test adapters", async () => {
    const { solanaObservationIsV1Only, solanaObservationHasV2InstitutionalCapability } = await import(
      "@/lib/partner/onchainGateDeployments/adapters"
    );
    expect(solanaObservationIsV1Only({
      programId: PROGRAM,
      gateConfigPda: PDA,
      programDigest: (`0x${"cd".repeat(32)}`) as `0x${string}`,
      configDigest: (`0x${"cd".repeat(32)}`) as `0x${string}`,
    })).toBe(true);
    expect(solanaObservationHasV2InstitutionalCapability({
      programId: PROGRAM,
      gateConfigPda: PDA,
      programDigest: (`0x${"cd".repeat(32)}`) as `0x${string}`,
      configDigest: (`0x${"cd".repeat(32)}`) as `0x${string}`,
    })).toBe(false);

    process.env[ONCHAIN_DEPLOYMENT_TEST_ADAPTER_ENV] = "1";
    const { bindIssuanceToVerifiedDeployment } = await import("@/lib/partner/onchainGateDeployments/bindIssuance");
    const denied = await bindIssuanceToVerifiedDeployment({
      partnerId: EVM_REF_PARTNER_ID,
      applicationId: "app-adapter",
      networkId: "evm_sandbox",
      actionType: "enable_protocol_access",
      actionScope: "sandbox:protocol_access",
      kitEnvironment: "production",
      policyId: EVM_REF_POLICY_ID,
      policyVersion: 1,
      signerKeyId: "evm-attestation-test-1",
      testAdapter: { source: "local_anvil", chainId: 31337, verifyingContract: GATE },
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.reason).toBe("deployment_not_verified");
  });
});
