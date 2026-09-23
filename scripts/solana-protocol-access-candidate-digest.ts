#!/usr/bin/env npx tsx
// Secret-free digest for the human-built protocol-access consumer candidate.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { solanaProgramElfKeccak, solanaProgramElfSha256 } from "@/lib/partner/onchainGateDeployments/solanaElfDigest";
import { encodeProgramDataAccount, programDataElf } from "@/lib/partner/onchainGateDeployments/solanaObserve";
import { SOLANA_UPGRADEABLE_LOADER } from "@/lib/partner/onchainGateDeployments/solanaArtifacts";

const PROGRAM_ID = "3B9eE1WtrtZQwJrkhFSKxxaZrefRJ73P53xHBBP3Bv1j";
const source = readFileSync(resolve("solana/abraxas-eligibility-gate/programs/abraxas-protocol-access/src/lib.rs"), "utf8");
const anchor = readFileSync(resolve("solana/abraxas-eligibility-gate/Anchor.toml"), "utf8");
if (!source.includes(`declare_id!("${PROGRAM_ID}")`) || !anchor.includes(`abraxas_protocol_access = "${PROGRAM_ID}"`)) {
  console.error("protocol_access_program_id_mismatch");
  process.exit(1);
}

const elfPath = resolve(process.env.SOLANA_PROTOCOL_ACCESS_RELEASE_ELF
  ?? "solana/abraxas-eligibility-gate/target/deploy/abraxas_protocol_access.so");
if (!existsSync(elfPath)) {
  console.error("missing_elf", elfPath);
  process.exit(2);
}
const elf = readFileSync(elfPath);
const keccak = solanaProgramElfKeccak(elf);
const sha = solanaProgramElfSha256(elf);
const wrapped = encodeProgramDataAccount(elf, "11111111111111111111111111111111");
const stripped = programDataElf({ owner: SOLANA_UPGRADEABLE_LOADER, data: wrapped });
const observationDigest = stripped ? solanaProgramElfKeccak(stripped) : null;
const ok = elf.length > 0 && observationDigest === keccak;
console.log(JSON.stringify({
  artifact: "abraxas_protocol_access_devnet_candidate",
  program_id: PROGRAM_ID,
  elf_path: elfPath,
  bytes: elf.length,
  program_data_digest: keccak,
  elf_sha256: sha,
  observation_digest: observationDigest,
  status: "candidate_unreviewed",
  deploy_ready: false,
}, null, 2));
process.exit(ok ? 0 : 1);
