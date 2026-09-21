import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { planTestnetGate } from "./plan";
import { deployTestnetGate } from "./deploy";
import { verifyTestnetManifest } from "./verify";
import { registerTestnetManifest } from "./register";
import { runAbraxasGate } from "./cli";
import { rejectForbiddenNetwork, publishedArcTestnetChainId } from "./networks";
import { testnetKitLaunchpadCard, testnetReadinessReport, testnetKitSafeState } from "./readiness";
import { TESTNET_GATE_COMMANDS, TESTNET_GATE_SAFE_STATES, APPROVED_EVM_TESTNET_CHAIN_ID } from "./contract";
import { EVM_TESTNET_TEST_PLAN, SOLANA_DEVNET_TEST_PLAN } from "./testPlans";
import {
  expectedEvmConfigDigest,
  hashesForApplication,
  resetOnchainVerificationFixtures,
  setLocalAnvilFixture,
  setLocalSolanaProgramTestFixture,
} from "@/lib/partner/onchainGateDeployments";
import { EVM_REF_PARTNER_ID, EVM_REF_POLICY_ID } from "@/lib/partner/evm/fixtures";
import { studioPublicCatalog, studioSnippetForPath } from "@/lib/partner/integrationStudio";
import { STARTER_KIT_VERSION } from "@/lib/partner/starterKit/contract";
import { generateStarterKit } from "@/lib/partner/starterKit/generate";
import { validateStarterKitInput } from "@/lib/partner/starterKit/validate";

if (!process.env.NEXTAUTH_SECRET?.trim()) process.env.NEXTAUTH_SECRET = "testnet-gate-kit-secret";

vi.mock("@/lib/supabase/admin", async () => {
  const { requireWalletStandardTestAdmin } = await import("@/lib/partner/walletStandard/fakeDurableBackend");
  return { requireSupabaseAdmin: requireWalletStandardTestAdmin };
});

import { resetFakeWalletStandardBackend } from "@/lib/partner/walletStandard/fakeDurableBackend";

const GATE = "0x1111111111111111111111111111111111111111" as const;
const BYTECODE = (`0x${"ab".repeat(32)}`) as `0x${string}`;
const PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const PDA = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";

function evmRegistryManifest() {
  const hashes = hashesForApplication({
    partnerId: EVM_REF_PARTNER_ID,
    policyId: EVM_REF_POLICY_ID,
    policyVersion: 1,
    actionType: "activate_protocol_access",
    actionScope: "sandbox:protocol_access",
    environment: "sandbox",
    signerKeyId: "evm-attestation-test-1",
  });
  const config_digest = expectedEvmConfigDigest({
    chainId: APPROVED_EVM_TESTNET_CHAIN_ID,
    gateAddress: GATE,
    partnerHash: hashes.partner_hash,
    policyHash: hashes.policy_hash,
    actionHash: hashes.action_hash,
    environment: hashes.environment_hash,
    signerKeyId: "evm-attestation-test-1",
    subjectBindingMode: "required",
  });
  return {
    schema_version: 1 as const,
    gate_type: "evm" as const,
    network_id: "evm_sepolia",
    chain_id: APPROVED_EVM_TESTNET_CHAIN_ID,
    gate_address: GATE,
    bytecode_hash: BYTECODE,
    config_digest,
    partner_hash: hashes.partner_hash,
    policy_hash: hashes.policy_hash,
    action_hash: hashes.action_hash,
    action_type: "activate_protocol_access",
    action_scope: "sandbox:protocol_access",
    environment: "sandbox" as const,
    signer_key_id: "evm-attestation-test-1",
    subject_binding_mode: "required" as const,
  };
}

describe("testnet gate deployment kit", () => {
  beforeEach(() => {
    resetFakeWalletStandardBackend();
    resetOnchainVerificationFixtures();
  });

  it("plans deterministic manifests for solana and evm", () => {
    const a = planTestnetGate({ target: "evm", now: "2026-09-21T00:00:00.000Z" });
    const b = planTestnetGate({ target: "evm", now: "2026-09-21T00:00:00.000Z" });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.envelope.kit_digest).toBe(b.envelope.kit_digest);
    expect(a.envelope.chain_id).toBe(11155111);
    expect(a.envelope.live).toBe(false);
    expect(a.envelope.registry_manifest).toBeNull();
    const sol = planTestnetGate({ target: "solana", now: "2026-09-21T00:00:00.000Z" });
    expect(sol.ok).toBe(true);
    if (sol.ok) expect(sol.envelope.network_id).toBe("solana_devnet");
  });

  it("requires explicit confirmation and refuses automated environments", async () => {
    const noFlag = await runAbraxasGate(["deploy", "evm-testnet"]);
    expect(noFlag.ok).toBe(false);
    if (!noFlag.ok) expect(noFlag.reason).toBe("confirmation_required");
    const auto = deployTestnetGate({ target: "solana-devnet", confirm: true, env: { CI: "1" } });
    expect(auto.ok).toBe(false);
    if (!auto.ok) expect(auto.reason).toBe("automated_environment_forbidden");
    const vercel = deployTestnetGate({ target: "evm-testnet", confirm: true, env: { VERCEL: "1" } });
    expect(vercel.ok).toBe(false);
  });

  it("rejects mainnet and unpublished Arc", () => {
    expect(rejectForbiddenNetwork("evm_mainnet")).toBe("mainnet_forbidden");
    expect(rejectForbiddenNetwork("solana_mainnet")).toBe("mainnet_forbidden");
    expect(rejectForbiddenNetwork("arc_circle_mainnet")).toBe("mainnet_forbidden");
    expect(publishedArcTestnetChainId()).toBeNull();
    expect(rejectForbiddenNetwork("arc_circle_testnet")).toBe("arc_chain_id_unpublished");
    expect(rejectForbiddenNetwork("not_a_network")).toBe("unknown_network");
  });

  it("fails closed without operator RPC and signer config", () => {
    const result = deployTestnetGate({
      target: "evm-testnet",
      confirm: true,
      env: { NODE_ENV: "development" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("missing_operator_config");
  });

  it("does not broadcast even with confirm and local placeholders", () => {
    const result = deployTestnetGate({
      target: "evm-testnet",
      confirm: true,
      env: {
        NODE_ENV: "development",
        ABRAXAS_GATE_EVM_RPC_URL: "http://127.0.0.1:8545",
        ABRAXAS_GATE_EVM_PRIVATE_KEY: "0xnot-a-broadcast",
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("human_broadcast_not_invoked");
  });

  it("detects manifest tampering and digest mismatch", async () => {
    const manifest = evmRegistryManifest();
    setLocalAnvilFixture(GATE, { codeHash: BYTECODE, configDigest: manifest.config_digest });
    const ok = await verifyTestnetManifest(manifest);
    expect(ok.ok).toBe(true);
    const tampered = { ...manifest, rpc_url: "http://evil" };
    const leak = await verifyTestnetManifest(tampered);
    expect(leak.ok).toBe(false);
    const digest = await verifyTestnetManifest({ ...manifest, config_digest: (`0x${"11".repeat(32)}`) });
    expect(digest.ok).toBe(false);
    if (!digest.ok) expect(digest.reason).toBe("config_digest_mismatch");
  });

  it("registers only after chain verification", async () => {
    const manifest = evmRegistryManifest();
    const env = {
      ABRAXAS_GATE_PARTNER_ID: EVM_REF_PARTNER_ID,
      ABRAXAS_GATE_APPLICATION_ID: "app-kit",
      ABRAXAS_GATE_POLICY_ID: EVM_REF_POLICY_ID,
      ABRAXAS_GATE_POLICY_VERSION: "1",
    };
    const blocked = await registerTestnetManifest({ raw: manifest, env });
    expect(blocked.ok).toBe(false);
    setLocalAnvilFixture(GATE, { codeHash: BYTECODE, configDigest: manifest.config_digest });
    const ok = await registerTestnetManifest({ raw: manifest, env });
    expect(ok.ok).toBe(true);
  });

  it("readiness requires verified sandbox and matching bindings", () => {
    const hashes = hashesForApplication({
      partnerId: EVM_REF_PARTNER_ID,
      policyId: EVM_REF_POLICY_ID,
      policyVersion: 1,
      actionType: "activate_protocol_access",
      actionScope: "sandbox:protocol_access",
      environment: "sandbox",
      signerKeyId: "evm-attestation-test-1",
    });
    const report = testnetReadinessReport({
      record: {
        deployment_ref: "ogd_test",
        partner_id: EVM_REF_PARTNER_ID,
        application_id: "app-kit",
        gate_type: "evm",
        network_id: "evm_sepolia",
        chain_id: 11155111,
        gate_address: GATE,
        bytecode_hash: BYTECODE,
        config_digest: hashes.partner_hash,
        program_id: null,
        gate_config_pda: null,
        program_digest: null,
        partner_hash: hashes.partner_hash,
        policy_hash: hashes.policy_hash,
        action_hash: hashes.action_hash,
        action_type: "activate_protocol_access",
        action_scope: "sandbox:protocol_access",
        environment: "sandbox",
        signer_key_id: "evm-attestation-test-1",
        subject_binding_mode: "required",
        status: "verified_sandbox",
        production_reviewed_at: null,
        revoked_at: null,
        created_at: "2026-09-21T00:00:00.000Z",
        updated_at: "2026-09-21T00:00:00.000Z",
      },
      expectedPartnerHash: hashes.partner_hash,
      expectedPolicyHash: hashes.policy_hash,
      expectedActionHash: hashes.action_hash,
      expectedSignerKeyId: "evm-attestation-test-1",
    });
    expect(report.issuance_unblocked).toBe(true);
    expect(report.production_mainnet_posture).toBe(false);
    expect(testnetKitSafeState({})).toBe("not_planned");
    expect(testnetKitLaunchpadCard("ready_to_plan").deploy_button).toBe(false);
  });

  it("keeps adapters local in automated tests and has no API deploy path", () => {
    setLocalSolanaProgramTestFixture(PROGRAM, PDA, {
      programId: PROGRAM,
      gateConfigPda: PDA,
      programDigest: (`0x${"cd".repeat(32)}`) as `0x${string}`,
      configDigest: (`0x${"cd".repeat(32)}`) as `0x${string}`,
    });
    const api = readFileSync(join(process.cwd(), "app/api/launchpad/applications/[id]/onchain-gate-deployments/route.ts"), "utf8");
    expect(api).not.toContain("deployTestnetGate");
    expect(api).not.toContain("forge script");
    const card = readFileSync(join(process.cwd(), "components/partner/launchpad/TestnetGateDeploymentKitCard.tsx"), "utf8");
    expect(card).not.toMatch(/<button/i);
    expect(card).not.toMatch(/onClick=\{.*deploy/);
  });

  it("documents commands, test plans, studio, starter kit, and docs", () => {
    expect(TESTNET_GATE_COMMANDS.length).toBe(6);
    expect(TESTNET_GATE_SAFE_STATES).toContain("verified_sandbox");
    expect(SOLANA_DEVNET_TEST_PLAN.failure_cases.length).toBeGreaterThan(0);
    expect(EVM_TESTNET_TEST_PLAN.expected_safe_outputs.join(" ")).not.toMatch(/USDC|Circle Mainnet|live program id/i);
    const snippet = studioSnippetForPath("testnet_gate_deployment");
    expect(snippet.docs).toBe("/docs/testnet-gate-deployment");
    expect(snippet.code).toContain("--confirm");
    const catalog = studioPublicCatalog({ pathId: "testnet_gate_deployment" });
    expect(catalog.testnet_gate_deployment.browser_deploy).toBe(false);
    expect(STARTER_KIT_VERSION).toBe("1.11.0");
    const validated = validateStarterKitInput({
      pack_id: "age_21_retail",
      path: "testnet_gate_deployment",
      runtime: "universal_https",
    });
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;
    const kit = generateStarterKit(validated.selection);
    expect(kit.ok).toBe(true);
    if (!kit.ok) return;
    expect(kit.files.some((file) => file.path === "TESTNET_GATE_DEPLOYMENT.md")).toBe(true);
    const docs = readFileSync(join(process.cwd(), "app/docs/testnet-gate-deployment/page.tsx"), "utf8");
    expect(docs).toContain("Human-operated");
    expect(docs).not.toMatch(/live mainnet deployment|fake USDC|0xdeadbeef/);
  });
});
