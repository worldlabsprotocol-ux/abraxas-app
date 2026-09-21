import { describe, expect, it } from "vitest";
import { writeFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hashesForApplication, expectedEvmConfigDigest, expectedSolanaConfigDigest } from "@/lib/partner/onchainGateDeployments";
import { EVM_REF_PARTNER_ID, EVM_REF_POLICY_ID } from "@/lib/partner/evm/fixtures";
import {
  evaluateConformance,
  evaluateVectorConformance,
  rejectBrowserConformanceMark,
} from "./verify";
import { serializeConformanceReport, reportLeaks } from "./report";
import { runAbraxasConformance } from "./cli";
import { PUBLIC_VERIFIER_PACKAGE } from "./artifacts";
import { CONFORMANCE_VECTOR_PACKAGE, evmConformanceDigest, solanaConformanceMessage, solanaV1LegacyMessage } from "./vectors";
import { ONCHAIN_VERIFIER_CONFORMANCE_FORBIDDEN_KEYS } from "./contract";
import { onchainVerifierLaunchpadCard, onchainVerifierSafeState } from "./readiness";

const GATE = "0x1111111111111111111111111111111111111111" as const;
const PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const PDA = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";

function evmManifest() {
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
    chainId: 11155111,
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
    chain_id: 11155111,
    gate_address: GATE,
    bytecode_hash: (`0x${"ab".repeat(32)}`) as `0x${string}`,
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

function solanaManifest() {
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
    subjectBindingMode: "required",
  });
  return {
    schema_version: 1 as const,
    gate_type: "solana" as const,
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
    environment: "sandbox" as const,
    signer_key_id: "solana-attestation-test-1",
    subject_binding_mode: "required" as const,
  };
}

describe("onchain verifier conformance", () => {
  it("matches published EVM and Solana vectors", () => {
    expect(evaluateVectorConformance().ok).toBe(true);
    expect(evmConformanceDigest()).toBe(CONFORMANCE_VECTOR_PACKAGE.evm.digest);
    expect(solanaConformanceMessage()).toBe(CONFORMANCE_VECTOR_PACKAGE.solana_v2.message_hex);
    expect(CONFORMANCE_VECTOR_PACKAGE.solana_v2.message_hex.slice(2).length / 2).toBe(468);
    expect(solanaV1LegacyMessage().length).toBe(372);
    expect(PUBLIC_VERIFIER_PACKAGE.evm.payable).toBe(false);
    expect(PUBLIC_VERIFIER_PACKAGE.solana.arbitrary_cpi).toBe(false);
  });

  it("accepts a valid EVM and Solana sandbox manifest", () => {
    expect(evaluateConformance({ raw: evmManifest(), receiptRefetched: true }).ok).toBe(true);
    expect(evaluateConformance({ raw: solanaManifest(), receiptRefetched: true }).ok).toBe(true);
  });

  it("covers mismatch classes and institutional V1 rejection", () => {
    const digest = evaluateConformance({ raw: { ...evmManifest(), config_digest: (`0x${"11".repeat(32)}`) } });
    expect(digest.reasons).toContain("binding_mismatch");
    const signer = evaluateConformance({ raw: evmManifest(), trustedSignerKeyId: "other-key" });
    expect(signer.reasons).toContain("signer_mismatch");
    const stale = evaluateConformance({ raw: evmManifest(), trustedSignerStatus: "revoked" });
    expect(stale.reasons).toContain("signer_update_required");
    const expired = evaluateConformance({ raw: { registry_manifest: evmManifest(), expires_at: 1 }, nowSeconds: 10 });
    expect(expired.reasons).toContain("expired");
    const replay = evaluateConformance({ raw: { registry_manifest: evmManifest(), nonce: "n1" }, consumedNonces: ["n1"] });
    expect(replay.reasons).toContain("replayed");
    const presentation = evaluateConformance({ raw: evmManifest(), receiptRefetched: false });
    expect(presentation.reasons).toContain("presentation_insufficient");
    const leak = evaluateConformance({ raw: { ...evmManifest(), private_key: "secret" } });
    expect(leak.reasons).toContain("forbidden_field");
    const institutional = evaluateConformance({
      raw: {
        schema_version: 1,
        institutional: { institutional_required: true },
        registry_manifest: solanaManifest(),
        solana_v2: { message_len: 372, prefix: "ABRAXAS_CHAIN_ELIGIBILITY_V1", schema_version: 1 },
      },
      institutionalRequired: true,
      solanaObservation: { canonicalMessageLen: 372, schemaVersion: 1, requireInstitutional: false, institutionalCapable: false },
    });
    expect(institutional.reasons).toContain("institutional_required");
  });

  it("serializes a shareable report without secrets", () => {
    const result = evaluateConformance({ raw: evmManifest() });
    const report = serializeConformanceReport("report", result);
    expect(report.live).toBe(false);
    expect(report.from_browser).toBe(false);
    expect(reportLeaks(report)).toEqual([]);
    expect(JSON.stringify(report)).not.toMatch(/private_key|legal_name|rpc_url|ubo/);
    expect(ONCHAIN_VERIFIER_CONFORMANCE_FORBIDDEN_KEYS).toContain("private_key");
  });

  it("rejects browser self-marking and CLI browser env", () => {
    expect(rejectBrowserConformanceMark({ from_browser: true }).reason).toBe("unauthorized");
    expect(evaluateConformance({ raw: evmManifest(), fromBrowser: true }).reasons).toContain("unauthorized");
    const cli = runAbraxasConformance(["vectors"], { ABRAXAS_CONFORMANCE_FROM_BROWSER: "1" });
    expect(cli.ok).toBe(false);
    expect(cli.reason).toBe("unauthorized");
  });

  it("runs local CLI commands against a file", () => {
    const dir = mkdtempSync(join(tmpdir(), "abra-conf-"));
    const file = join(dir, "manifest.json");
    writeFileSync(file, JSON.stringify(evmManifest()));
    expect(runAbraxasConformance(["vectors"]).ok).toBe(true);
    expect(runAbraxasConformance(["evm", file]).ok).toBe(true);
    expect(runAbraxasConformance(["report", file]).ok).toBe(true);
    const sol = join(dir, "sol.json");
    writeFileSync(sol, JSON.stringify(solanaManifest()));
    expect(runAbraxasConformance(["solana", sol]).ok).toBe(true);
    expect(runAbraxasConformance(["evm", sol]).ok).toBe(false);
  });

  it("keeps launchpad checklist non-actionable", () => {
    const card = onchainVerifierLaunchpadCard(onchainVerifierSafeState({ verifiedSandbox: true, vectorsReady: true }));
    expect(card.deploy_button).toBe(false);
    expect(card.browser_register).toBe(false);
    expect(card.browser_approve).toBe(false);
    expect(card.sequence[0]).toBe("Download verifier package");
  });

  it("has no browser or API self-marking route", () => {
    const route = readFileSync(join(process.cwd(), "app/api/developers/integration-studio/route.ts"), "utf8");
    expect(route).not.toMatch(/conformant_sandbox|markConformance|abraxas-conformance/);
    expect(rejectBrowserConformanceMark({ request: { ok: true } }).ok).toBe(false);
  });
});
