import { describe, expect, it } from "vitest";
import { solanaProgramElfKeccak, solanaProgramElfSha256 } from "@/lib/partner/onchainGateDeployments/solanaElfDigest";
import { deriveGateConfigPda, encodeProgramDataAccount, encodeUpgradeableProgramAccount } from "@/lib/partner/onchainGateDeployments/solanaObserve";
import { SOLANA_UPGRADEABLE_LOADER } from "@/lib/partner/onchainGateDeployments/solanaArtifacts";
import {
  inspectSolanaDevnetBeforeConfig,
  REVIEWED_DEVNET_PROGRAMS,
  SOLANA_DEVNET_GENESIS_HASH,
  type PublicSolanaAccountSource,
} from "./solanaDevnetChainPrecheck";

const admin = "28M4TxRGsh5fbo7BDfR7gtdAxbsPjmMJiX8LAU32doHt";
const gateData = "8uZep2zGjgezuooDeqTQfqKXBW3AvQx51WcqKx8dzjK5";
const consumerData = "BWdQjZ58KTjdYUHji7vYNXeTXhB8fi81oqfKyYoG8EGp";
const gateElf = new TextEncoder().encode("gate-test-elf");
const consumerElf = new TextEncoder().encode("consumer-test-elf");
const reviewed = {
  gate: {
    programId: REVIEWED_DEVNET_PROGRAMS.gate.programId,
    elfBytes: gateElf.length,
    keccak: solanaProgramElfKeccak(gateElf),
    sha256: solanaProgramElfSha256(gateElf),
  },
  consumer: {
    programId: REVIEWED_DEVNET_PROGRAMS.consumer.programId,
    elfBytes: consumerElf.length,
    keccak: solanaProgramElfKeccak(consumerElf),
    sha256: solanaProgramElfSha256(consumerElf),
  },
};
const accounts = new Map([
  [reviewed.gate.programId, { owner: SOLANA_UPGRADEABLE_LOADER, data: encodeUpgradeableProgramAccount(gateData) }],
  [gateData, { owner: SOLANA_UPGRADEABLE_LOADER, data: encodeProgramDataAccount(gateElf, admin) }],
  [reviewed.consumer.programId, { owner: SOLANA_UPGRADEABLE_LOADER, data: encodeUpgradeableProgramAccount(consumerData) }],
  [consumerData, { owner: SOLANA_UPGRADEABLE_LOADER, data: encodeProgramDataAccount(consumerElf, admin) }],
]);

function input(overrides: {
  genesis?: () => Promise<string | null>;
  readAccount?: PublicSolanaAccountSource;
} = {}) {
  return {
    adminPubkey: admin,
    reviewed,
    genesis: overrides.genesis ?? (async () => SOLANA_DEVNET_GENESIS_HASH),
    readAccount: overrides.readAccount ?? (async (key: string) => accounts.get(key) ?? null),
  };
}

describe("read-only Solana devnet chain precheck", () => {
  it("uses the canonical onchain upgradeable-loader owner", () => {
    expect(SOLANA_UPGRADEABLE_LOADER).toBe("BPFLoaderUpgradeab1e11111111111111111111111");
  });

  it("matches both upgradeable ELF digests and an uninitialized admin PDA", async () => {
    let genesisReads = 0;
    const result = await inspectSolanaDevnetBeforeConfig(input({
      genesis: async () => { genesisReads += 1; return SOLANA_DEVNET_GENESIS_HASH; },
    }));
    expect(result).toMatchObject({
      ok: true,
      network_id: "solana_devnet",
      gate_program_id: REVIEWED_DEVNET_PROGRAMS.gate.programId,
      consumer_program_id: REVIEWED_DEVNET_PROGRAMS.consumer.programId,
      gate_config_pda: deriveGateConfigPda(reviewed.gate.programId, admin),
      gate_artifact: "matched",
      consumer_artifact: "matched",
      gate_config_state: "uninitialized",
      ownership_verified: false,
      broadcast: false,
    });
    expect(genesisReads).toBe(2);
  });

  it("rejects wrong cluster, changed binaries, absent programs and an occupied config", async () => {
    expect(await inspectSolanaDevnetBeforeConfig(input({ genesis: async () => "mainnet" })))
      .toEqual({ ok: false, reason: "wrong_cluster", broadcast: false });
    expect(await inspectSolanaDevnetBeforeConfig(input({
      readAccount: async (key) => key === gateData
        ? { owner: SOLANA_UPGRADEABLE_LOADER, data: encodeProgramDataAccount(consumerElf, admin) }
        : accounts.get(key) ?? null,
    }))).toEqual({ ok: false, reason: "gate_artifact_mismatch", broadcast: false });
    expect(await inspectSolanaDevnetBeforeConfig(input({
      readAccount: async (key) => key === reviewed.consumer.programId ? null : accounts.get(key) ?? null,
    }))).toEqual({ ok: false, reason: "consumer_program_missing", broadcast: false });
    const pda = deriveGateConfigPda(reviewed.gate.programId, admin);
    expect(await inspectSolanaDevnetBeforeConfig(input({
      readAccount: async (key) => key === pda
        ? { owner: reviewed.gate.programId, data: new Uint8Array(8) }
        : accounts.get(key) ?? null,
    }))).toEqual({ ok: false, reason: "gate_config_already_initialized", broadcast: false });
  });

  it("fails closed on unavailable RPC and changed cluster at the final read", async () => {
    expect(await inspectSolanaDevnetBeforeConfig(input({
      readAccount: async () => ({ unavailable: true }),
    }))).toEqual({ ok: false, reason: "rpc_unavailable", broadcast: false });
    let n = 0;
    expect(await inspectSolanaDevnetBeforeConfig(input({
      genesis: async () => (++n === 1 ? SOLANA_DEVNET_GENESIS_HASH : "mainnet"),
    }))).toEqual({ ok: false, reason: "wrong_cluster", broadcast: false });
  });
});

