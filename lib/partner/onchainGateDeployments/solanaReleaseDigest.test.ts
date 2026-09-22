import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Keypair } from "@solana/web3.js";
import { solanaProgramElfKeccak, solanaProgramElfSha256 } from "./solanaElfDigest";
import {
  lookupSolanaGateArtifact,
  solanaFixtureArtifactsAllowed,
  SOLANA_GATE_V1_PROGRAM_DIGEST,
  SOLANA_GATE_V1_PROGRAM_ELF,
  SOLANA_GATE_V2_CAPABILITY_MISMATCH_DIGEST,
  SOLANA_GATE_V2_PROGRAM_DIGEST,
  SOLANA_GATE_V2_PROGRAM_ELF,
  SOLANA_GATE_V2_RETIRED_DIGEST,
  SOLANA_GATE_V2_REVOKED_DIGEST,
  SOLANA_UPGRADEABLE_LOADER,
} from "./solanaArtifacts";
import { SOLANA_GATE_V2_RELEASE } from "./solanaV2Release";
import { encodeProgramDataAccount, programDataElf } from "./solanaObserve";

const ELF_PATH = resolve("solana/abraxas-eligibility-gate/target/deploy/abraxas_eligibility_gate.so");

describe("Solana V2 reproducible release digest", () => {
  it("matches the registry keccak and SHA-256 when the rebuilt ELF is present", () => {
    if (!existsSync(ELF_PATH)) {
      expect(SOLANA_GATE_V2_RELEASE.program_data_digest).toMatch(/^0x[0-9a-f]{64}$/);
      expect(SOLANA_GATE_V2_RELEASE.elf_sha256).toMatch(/^0x[0-9a-f]{64}$/);
      return;
    }
    const elf = readFileSync(ELF_PATH);
    expect(solanaProgramElfKeccak(elf)).toBe(SOLANA_GATE_V2_RELEASE.program_data_digest);
    expect(solanaProgramElfSha256(elf)).toBe(SOLANA_GATE_V2_RELEASE.elf_sha256);
    const wrapped = encodeProgramDataAccount(elf, Keypair.generate().publicKey.toBase58());
    const stripped = programDataElf({ owner: SOLANA_UPGRADEABLE_LOADER, data: wrapped });
    expect(stripped).not.toBeNull();
    if (!stripped) return;
    expect(solanaProgramElfKeccak(stripped)).toBe(SOLANA_GATE_V2_RELEASE.program_data_digest);
    expect(lookupSolanaGateArtifact(SOLANA_GATE_V2_RELEASE.program_data_digest)?.artifact_id)
      .toBe(SOLANA_GATE_V2_RELEASE.artifact_id);
  });

  it("normalizes observation digest the same way as the release path for fixture ELF bytes", () => {
    const keccak = solanaProgramElfKeccak(SOLANA_GATE_V2_PROGRAM_ELF);
    expect(keccak).toBe(SOLANA_GATE_V2_PROGRAM_DIGEST);
    const wrapped = encodeProgramDataAccount(SOLANA_GATE_V2_PROGRAM_ELF, Keypair.generate().publicKey.toBase58());
    const stripped = programDataElf({ owner: SOLANA_UPGRADEABLE_LOADER, data: wrapped });
    expect(stripped && solanaProgramElfKeccak(stripped)).toBe(keccak);
  });

  it("rejects fixture fingerprints, revoked, retired, and capability-mismatch rows outside approved lookup", () => {
    expect(lookupSolanaGateArtifact(SOLANA_GATE_V2_REVOKED_DIGEST)).toBeNull();
    expect(lookupSolanaGateArtifact(SOLANA_GATE_V2_RETIRED_DIGEST)).toBeNull();
    expect(lookupSolanaGateArtifact(SOLANA_GATE_V2_CAPABILITY_MISMATCH_DIGEST)).toBeNull();
    expect(lookupSolanaGateArtifact(`0x${"11".repeat(32)}`)).toBeNull();
    expect(solanaFixtureArtifactsAllowed()).toBe(true);
    expect(lookupSolanaGateArtifact(SOLANA_GATE_V2_PROGRAM_DIGEST)?.fixture).toBe(true);
    const prior = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    expect(lookupSolanaGateArtifact(SOLANA_GATE_V2_PROGRAM_DIGEST)).toBeNull();
    expect(lookupSolanaGateArtifact(SOLANA_GATE_V1_PROGRAM_DIGEST)).toBeNull();
    expect(lookupSolanaGateArtifact(SOLANA_GATE_V2_RELEASE.program_data_digest)?.status).toBe("approved");
    process.env.NODE_ENV = prior;
  });

  it("does not treat a one-byte ELF mutation or V1 ELF as the released V2 digest", () => {
    const mutated = Uint8Array.from(SOLANA_GATE_V2_PROGRAM_ELF);
    mutated[0] = (mutated[0] + 1) % 256;
    expect(solanaProgramElfKeccak(mutated)).not.toBe(SOLANA_GATE_V2_PROGRAM_DIGEST);
    expect(solanaProgramElfKeccak(SOLANA_GATE_V1_PROGRAM_ELF)).toBe(SOLANA_GATE_V1_PROGRAM_DIGEST);
    expect(SOLANA_GATE_V1_PROGRAM_DIGEST).not.toBe(SOLANA_GATE_V2_RELEASE.program_data_digest);
  });
});
