import { describe, expect, it, beforeEach, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Keypair } from "@solana/web3.js";
import { hashAction, hashEnvironment, hashNetworkId, hashPartnerId, hashPolicy, hashSignerKeyId } from "@/lib/partner/chainAttestation/hashes";
import { EVM_REF_PARTNER_ID, EVM_REF_POLICY_ID } from "@/lib/partner/evm/fixtures";
import { expectedSolanaConfigDigest, hashesForApplication } from "./digests";
import {
  deriveGateConfigPda,
  encodeGateConfigAccount,
  encodeProgramDataAccount,
  encodeUpgradeableProgramAccount,
  observeSolanaFromAccounts,
} from "./solanaObserve";
import {
  SOLANA_GATE_V1_PROGRAM_DIGEST,
  SOLANA_GATE_V1_PROGRAM_ELF,
  SOLANA_GATE_V2_PROGRAM_DIGEST,
  SOLANA_GATE_V2_PROGRAM_ELF,
  SOLANA_GATE_V2_RETIRED_DIGEST,
  SOLANA_GATE_V2_REVOKED_DIGEST,
  SOLANA_UPGRADEABLE_LOADER,
} from "./solanaArtifacts";
import { SOLANA_GATE_V2_RELEASE, SOLANA_GATE_V2_RELEASE_R1 } from "./solanaV2Release";
import { solanaProgramElfKeccak } from "./solanaElfDigest";
import { localSolanaFixturesAllowed, resolveSolanaAdapter, serverSolanaRpcAdapter } from "./adapters";
import { launchpadRequestRejectsClientAuthority } from "./clientAuthority";
import { ONCHAIN_DEPLOYMENT_TEST_ADAPTER_ENV } from "./contract";

const SIGNER_ID = "solana-attestation-test-1";

function bindings(policyId = EVM_REF_POLICY_ID) {
  const hashes = hashesForApplication({
    partnerId: EVM_REF_PARTNER_ID,
    policyId,
    policyVersion: 1,
    actionType: "partner_protocol_action",
    actionScope: "sandbox:partner_protocol",
    environment: "sandbox",
    signerKeyId: SIGNER_ID,
  });
  return hashes;
}

function setup(overrides: {
  requireInstitutional?: boolean;
  elf?: Uint8Array;
  digest?: `0x${string}`;
  signerStatus?: number;
  wrongOwner?: boolean;
  wrongPda?: boolean;
  malformed?: boolean;
  policyId?: string;
  programId?: string;
} = {}) {
  const admin = Keypair.generate();
  const program = Keypair.generate();
  const partnerProgram = Keypair.generate();
  const programData = Keypair.generate();
  const policyId = overrides.policyId ?? EVM_REF_POLICY_ID;
  const hashes = bindings(policyId);
  const programId = overrides.programId ?? program.publicKey.toBase58();
  const pda = deriveGateConfigPda(programId, admin.publicKey.toBase58());
  const elf = overrides.elf ?? SOLANA_GATE_V2_PROGRAM_ELF;
  const programDigest = overrides.digest ?? SOLANA_GATE_V2_PROGRAM_DIGEST;
  const configDigest = expectedSolanaConfigDigest({
    programId,
    partnerProgramId: partnerProgram.publicKey.toBase58(),
    gateConfigPda: pda,
    programDigest,
    partnerHash: hashes.partner_hash,
    policyHash: hashes.policy_hash,
    actionHash: hashes.action_hash,
    environment: hashes.environment_hash,
    signerKeyId: SIGNER_ID,
    subjectBindingMode: "required",
  });
  const manifest = {
    schema_version: 1 as const,
    gate_type: "solana" as const,
    network_id: "solana_devnet",
    program_id: programId,
    partner_program_id: partnerProgram.publicKey.toBase58(),
    gate_config_pda: overrides.wrongPda ? Keypair.generate().publicKey.toBase58() : pda,
    program_digest: programDigest,
    config_digest: configDigest,
    partner_hash: hashes.partner_hash,
    policy_hash: hashes.policy_hash,
    action_hash: hashes.action_hash,
    action_type: "partner_protocol_action",
    action_scope: "sandbox:partner_protocol",
    environment: "sandbox" as const,
    signer_key_id: SIGNER_ID,
    subject_binding_mode: "required" as const,
  };
  const accounts = new Map<string, { owner: string; data: Uint8Array }>();
  accounts.set(programId, {
    owner: SOLANA_UPGRADEABLE_LOADER,
    data: encodeUpgradeableProgramAccount(programData.publicKey.toBase58()),
  });
  accounts.set(programData.publicKey.toBase58(), {
    owner: SOLANA_UPGRADEABLE_LOADER,
    data: encodeProgramDataAccount(elf, admin.publicKey.toBase58()),
  });
  const configBytes = overrides.malformed
    ? new Uint8Array([1, 2, 3])
    : encodeGateConfigAccount({
      admin: admin.publicKey.toBase58(),
      partnerProgram: partnerProgram.publicKey.toBase58(),
      networkId: hashNetworkId("solana_devnet"),
      partnerHash: hashes.partner_hash,
      policyHash: hashes.policy_hash,
      actionHash: hashes.action_hash,
      environment: hashEnvironment("sandbox"),
      requireSubject: true,
      requireInstitutional: overrides.requireInstitutional ?? true,
      bump: 255,
      signerKeyId: hashSignerKeyId(SIGNER_ID),
      signerStatus: overrides.signerStatus,
    });
  accounts.set(pda, {
    owner: overrides.wrongOwner ? Keypair.generate().publicKey.toBase58() : programId,
    data: configBytes,
  });
  if (overrides.wrongPda) {
    accounts.set(manifest.gate_config_pda, accounts.get(pda)!);
  }
  return { manifest, accounts, hashes };
}

function fetchFrom(accounts: Map<string, { owner: string; data: Uint8Array }>) {
  return async (pubkey: string) => accounts.get(pubkey) ?? null;
}

describe("structured Solana V2 observation", () => {
  beforeEach(() => {
    delete process.env.VERCEL;
    delete process.env[ONCHAIN_DEPLOYMENT_TEST_ADAPTER_ENV];
  });

  it("rejects a claimed partner program that differs from the decoded GateConfig", async () => {
    const { manifest, accounts } = setup();
    const forged = { ...manifest, partner_program_id: Keypair.generate().publicKey.toBase58() };
    const observed = await observeSolanaFromAccounts(forged, fetchFrom(accounts));
    expect(observed).toEqual({ ok: false, reason: "program_mismatch" });
  });

  it("binds server RPC observations to the declared Solana cluster", async () => {
    const previousFetch = globalThis.fetch;
    const previousRpcUrl = process.env.ABRAXAS_SOLANA_GATE_VERIFY_RPC_URL;
    process.env.ABRAXAS_SOLANA_GATE_VERIFY_RPC_URL = "http://127.0.0.1:8899";
    const { manifest, accounts } = setup();
    const devnetGenesis = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
    let genesisResponses = [devnetGenesis, devnetGenesis];
    const methods: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: { body?: string }) => {
      const request = JSON.parse(String(init.body)) as { method: string; params: string[] };
      methods.push(request.method);
      const result = request.method === "getGenesisHash"
        ? genesisResponses.shift()
        : (() => {
            const account = accounts.get(request.params[0]);
            return { value: account
              ? { owner: account.owner, data: [Buffer.from(account.data).toString("base64"), "base64"] }
              : null };
          })();
      return { ok: true, json: async () => ({ result }) };
    }));

    try {
      const adapter = serverSolanaRpcAdapter();
      expect(adapter).not.toBeNull();
      if (!adapter) return;
      const verified = await adapter.observe(manifest);
      expect("unavailable" in verified).toBe(false);
      expect("rejected" in verified).toBe(false);
      expect(methods).toEqual([
        "getGenesisHash", "getAccountInfo", "getAccountInfo", "getAccountInfo", "getGenesisHash",
      ]);

      methods.length = 0;
      genesisResponses = ["5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d"];
      expect(await adapter.observe(manifest)).toEqual({ unavailable: true });
      expect(methods).toEqual(["getGenesisHash"]);

      methods.length = 0;
      genesisResponses = [devnetGenesis, "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d"];
      expect(await adapter.observe(manifest)).toEqual({ unavailable: true });
      expect(methods).toEqual([
        "getGenesisHash", "getAccountInfo", "getAccountInfo", "getAccountInfo", "getGenesisHash",
      ]);
    } finally {
      vi.stubGlobal("fetch", previousFetch);
      if (previousRpcUrl === undefined) delete process.env.ABRAXAS_SOLANA_GATE_VERIFY_RPC_URL;
      else process.env.ABRAXAS_SOLANA_GATE_VERIFY_RPC_URL = previousRpcUrl;
    }
  });

  it("proves V2 institutional capability from program data and GateConfig", async () => {
    const { manifest, accounts } = setup();
    const observed = await observeSolanaFromAccounts(manifest, fetchFrom(accounts));
    expect(observed.ok).toBe(true);
    if (!observed.ok) return;
    expect(observed.observation.schemaVersion).toBe(2);
    expect(observed.observation.canonicalMessageLen).toBe(468);
    expect(observed.observation.institutionalCapable).toBe(true);
    expect(observed.observation.requireInstitutional).toBe(true);
    expect(observed.observation.artifactClass).toBe("v2_institutional");
    expect(observed.observation.signerClass).toBe("active_trusted");
    expect(observed.observation.digestMatchClass).toBe("matched");
    expect(JSON.stringify(observed.observation)).not.toMatch(/rpc|private_key|account bytes|0x[0-9a-f]{80,}/i);
  });

  it("rejects an institutional GateConfig pinned to one organization instead of reusable commitments", async () => {
    const { manifest, accounts } = setup();
    const row = accounts.get(manifest.gate_config_pda)!;
    const data = Buffer.from(row.data);
    data[8 + 32 * 7 + 2] = 1;
    accounts.set(manifest.gate_config_pda, { ...row, data });
    expect(await observeSolanaFromAccounts(manifest, fetchFrom(accounts)))
      .toEqual({ ok: false, reason: "institutional_required" });
  });

  it("rejects V1-only artifacts when GateConfig requires institutional", async () => {
    const { manifest, accounts } = setup({
      elf: SOLANA_GATE_V1_PROGRAM_ELF,
      digest: SOLANA_GATE_V1_PROGRAM_DIGEST,
      requireInstitutional: true,
    });
    const observed = await observeSolanaFromAccounts(manifest, fetchFrom(accounts));
    expect(observed.ok).toBe(false);
    if (!observed.ok) expect(observed.reason).toBe("institutional_required");
  });

  it("accepts V1 artifacts only as standard non-institutional observations", async () => {
    const { manifest, accounts } = setup({
      elf: SOLANA_GATE_V1_PROGRAM_ELF,
      digest: SOLANA_GATE_V1_PROGRAM_DIGEST,
      requireInstitutional: false,
    });
    const observed = await observeSolanaFromAccounts(manifest, fetchFrom(accounts));
    expect(observed.ok).toBe(true);
    if (!observed.ok) return;
    expect(observed.observation.requireInstitutional).toBe(false);
    expect(observed.observation.institutionalCapable).toBe(false);
    expect(observed.observation.artifactClass).toBe("v1_standard");
  });

  it("fail-closes unknown artifact, malformed config, wrong owner, wrong PDA, wrong digest, stale signer, and missing RPC", async () => {
    const unknown = setup({ elf: new TextEncoder().encode("not-an-approved-gate"), digest: (`0x${"11".repeat(32)}`) as `0x${string}` });
    unknown.manifest.program_digest = (`0x${"11".repeat(32)}`) as `0x${string}`;
    const unknownObs = await observeSolanaFromAccounts(unknown.manifest, fetchFrom(unknown.accounts));
    expect(unknownObs.ok).toBe(false);
    if (!unknownObs.ok) expect(unknownObs.reason).toBe("unrecognized_gate_artifact");

    const malformed = setup({ malformed: true });
    const bad = await observeSolanaFromAccounts(malformed.manifest, fetchFrom(malformed.accounts));
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.reason).toBe("invalid");

    const owner = setup({ wrongOwner: true });
    const ownerObs = await observeSolanaFromAccounts(owner.manifest, fetchFrom(owner.accounts));
    expect(ownerObs.ok).toBe(false);
    if (!ownerObs.ok) expect(ownerObs.reason).toBe("invalid");

    const pda = setup({ wrongPda: true });
    const pdaObs = await observeSolanaFromAccounts(pda.manifest, fetchFrom(pda.accounts));
    expect(pdaObs.ok).toBe(false);
    if (!pdaObs.ok) expect(pdaObs.reason).toBe("gate_config_mismatch");

    const digest = setup();
    digest.manifest.program_digest = SOLANA_GATE_V1_PROGRAM_DIGEST;
    const digestObs = await observeSolanaFromAccounts(digest.manifest, fetchFrom(digest.accounts));
    expect(digestObs.ok).toBe(false);
    if (!digestObs.ok) expect(digestObs.reason).toBe("program_mismatch");

    const stale = setup({ signerStatus: 3 });
    const staleObs = await observeSolanaFromAccounts(stale.manifest, fetchFrom(stale.accounts));
    expect(staleObs.ok).toBe(false);
    if (!staleObs.ok) expect(staleObs.reason).toBe("signer_update_required");

    const missing = await observeSolanaFromAccounts(setup().manifest, async () => ({ unavailable: true }));
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.reason).toBe("deployment_verification_unavailable");
  });

  it("rejects client observation overrides and isolates fixtures from production", () => {
    expect(launchpadRequestRejectsClientAuthority({
      manifest: {},
      schemaVersion: 2,
      canonicalMessageLen: 468,
      institutionalCapable: true,
    })).toBe(true);
    const prior = process.env.NODE_ENV;
    process.env.VERCEL = "1";
    expect(localSolanaFixturesAllowed()).toBe(false);
    expect(resolveSolanaAdapter({ kind: "local_program_test_fixture", observe: async () => ({ unavailable: true }) })).toBeNull();
    delete process.env.VERCEL;
    process.env.NODE_ENV = "production";
    expect(localSolanaFixturesAllowed()).toBe(false);
    process.env.NODE_ENV = prior;
  });

  it("accepts the reviewed V2 release ELF digest as institutional-capable and fail-closes mutations and loader errors", async () => {
    const elfPath = resolve("solana/abraxas-eligibility-gate/target/deploy/abraxas_eligibility_gate.so");
    if (existsSync(elfPath)) {
      const elf = readFileSync(elfPath);
      const builtDigest = solanaProgramElfKeccak(elf);
      if (builtDigest === SOLANA_GATE_V2_RELEASE.program_data_digest) {
        const { manifest, accounts } = setup({
          elf,
          digest: builtDigest,
          programId: SOLANA_GATE_V2_RELEASE.program_id,
        });
        const observed = await observeSolanaFromAccounts(manifest, fetchFrom(accounts));
        expect(observed.ok).toBe(true);
        if (observed.ok) {
          expect(observed.observation.institutionalCapable).toBe(true);
          expect(observed.observation.artifactClass).toBe("v2_institutional");
        }
      } else {
        const candidate = setup({ elf, digest: builtDigest });
        const observed = await observeSolanaFromAccounts(candidate.manifest, fetchFrom(candidate.accounts));
        expect(observed.ok).toBe(false);
        if (!observed.ok) expect(observed.reason).toBe(
          builtDigest === SOLANA_GATE_V2_RELEASE_R1.program_data_digest
            ? "program_mismatch"
            : "unrecognized_gate_artifact",
        );
      }
    }

    const wrongHeader = setup();
    const headerRow = [...wrongHeader.accounts.entries()].find(([, value]) => value.data.length > 45);
    if (headerRow) {
      const broken = Uint8Array.from(headerRow[1].data);
      broken[0] = 1;
      wrongHeader.accounts.set(headerRow[0], { owner: SOLANA_UPGRADEABLE_LOADER, data: broken });
    }
    const headerObs = await observeSolanaFromAccounts(wrongHeader.manifest, fetchFrom(wrongHeader.accounts));
    expect(headerObs.ok).toBe(false);
    if (!headerObs.ok) expect(headerObs.reason).toBe("program_mismatch");

    const revoked = setup({ digest: SOLANA_GATE_V2_REVOKED_DIGEST, elf: new TextEncoder().encode("revoked-control") });
    revoked.manifest.program_digest = SOLANA_GATE_V2_REVOKED_DIGEST;
    const revokedObs = await observeSolanaFromAccounts(revoked.manifest, fetchFrom(revoked.accounts));
    expect(revokedObs.ok).toBe(false);
    if (!revokedObs.ok) expect(revokedObs.reason).toBe("unrecognized_gate_artifact");

    const retired = setup({ digest: SOLANA_GATE_V2_RETIRED_DIGEST, elf: new TextEncoder().encode("retired-control") });
    retired.manifest.program_digest = SOLANA_GATE_V2_RETIRED_DIGEST;
    const retiredObs = await observeSolanaFromAccounts(retired.manifest, fetchFrom(retired.accounts));
    expect(retiredObs.ok).toBe(false);
    if (!retiredObs.ok) expect(retiredObs.reason).toBe("unrecognized_gate_artifact");
  });

  it("does not treat a matching V2 artifact as institutional without GateConfig.require_institutional", async () => {
    const { manifest, accounts } = setup({ requireInstitutional: false });
    const observed = await observeSolanaFromAccounts(manifest, fetchFrom(accounts));
    expect(observed.ok).toBe(true);
    if (!observed.ok) return;
    expect(observed.observation.institutionalCapable).toBe(false);
    expect(observed.observation.requireInstitutional).toBe(false);
  });

  it("does not treat partner or policy hashes from the client as authority when they disagree with GateConfig", async () => {
    const { manifest, accounts } = setup();
    manifest.partner_hash = hashPartnerId("other-tenant");
    const observed = await observeSolanaFromAccounts(manifest, fetchFrom(accounts));
    expect(observed.ok).toBe(false);
    if (!observed.ok) expect(observed.reason).toBe("tenant_mismatch");
  });
});
