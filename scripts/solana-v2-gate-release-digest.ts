#!/usr/bin/env npx tsx
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { solanaProgramElfKeccak, solanaProgramElfSha256 } from "@/lib/partner/onchainGateDeployments/solanaElfDigest";
import { SOLANA_GATE_V2_RELEASE } from "@/lib/partner/onchainGateDeployments/solanaV2Release";
import { encodeProgramDataAccount, programDataElf } from "@/lib/partner/onchainGateDeployments/solanaObserve";
import { SOLANA_UPGRADEABLE_LOADER } from "@/lib/partner/onchainGateDeployments/solanaArtifacts";

const elfPath = resolve(
  process.env.SOLANA_V2_RELEASE_ELF
    ?? "solana/abraxas-eligibility-gate/target/deploy/abraxas_eligibility_gate.so",
);

if (!existsSync(elfPath)) {
  console.error("missing_elf", elfPath);
  process.exit(2);
}

const elf = readFileSync(elfPath);
const keccak = solanaProgramElfKeccak(elf);
const sha = solanaProgramElfSha256(elf);
const wrapped = encodeProgramDataAccount(elf, "11111111111111111111111111111111");
const stripped = programDataElf({ owner: SOLANA_UPGRADEABLE_LOADER, data: wrapped });
const observed = stripped ? solanaProgramElfKeccak(stripped) : null;

const ok = keccak === SOLANA_GATE_V2_RELEASE.program_data_digest
  && sha === SOLANA_GATE_V2_RELEASE.elf_sha256
  && observed === keccak;

console.log(JSON.stringify({
  elf_path: elfPath,
  bytes: elf.length,
  program_data_digest: keccak,
  elf_sha256: sha,
  observation_digest: observed,
  matches_registry: ok,
}, null, 2));

process.exit(ok ? 0 : 1);
