// Independent RPC check: loader ownership, ProgramData authority and exact ELF bytes.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Connection, PublicKey, BPF_LOADER_UPGRADEABLE_PROGRAM_ID } from "@solana/web3.js";

const root = resolve(import.meta.dirname, "../..");
const manifest = JSON.parse(readFileSync(resolve(root, "solana/abraxas-eligibility-gate/release/devnet-entitlement-identity.json")));
if (manifest.status !== "approved") throw new Error("Devnet identities are not bound");
const expectedAuthority = new PublicKey(process.argv[2]);
const onlyProgram = process.argv[3];
const connection = new Connection(process.env.ABRAXAS_DEVNET_RPC_URL || "https://api.devnet.solana.com", "finalized");
if (await connection.getGenesisHash() !== manifest.genesis_hash) throw new Error("Not the approved Devnet genesis");
const results = [];
for (const [name, id] of [
  ["abraxas_proof_continuity", manifest.proof_continuity_program_id],
  ["abraxas_proof_entitlement_consumer", manifest.entitlement_consumer_program_id],
]) {
  if (onlyProgram && name !== onlyProgram) continue;
  const program = new PublicKey(id);
  const info = await connection.getAccountInfo(program, "finalized");
  if (!info?.owner.equals(BPF_LOADER_UPGRADEABLE_PROGRAM_ID) || !info.executable
      || info.data.length !== 36 || info.data.readUInt32LE(0) !== 2) throw new Error(`${name} program account invalid`);
  const programDataAddress = new PublicKey(info.data.subarray(4, 36));
  const programData = await connection.getAccountInfo(programDataAddress, "finalized");
  if (!programData?.owner.equals(BPF_LOADER_UPGRADEABLE_PROGRAM_ID)
      || programData.data.readUInt32LE(0) !== 3 || programData.data[12] !== 1
      || !new PublicKey(programData.data.subarray(13, 45)).equals(expectedAuthority)) {
    throw new Error(`${name} upgrade authority or ProgramData invalid`);
  }
  const elf = readFileSync(resolve(root, `solana/abraxas-eligibility-gate/target/deploy/${name}.so`));
  if (programData.data.length < 45 + elf.length || !programData.data.subarray(45, 45 + elf.length).equals(elf)) {
    throw new Error(`${name} deployed bytecode differs from compiled ELF`);
  }
  results.push({ name, program_id: id, program_data: programDataAddress.toBase58(),
    upgrade_authority: expectedAuthority.toBase58(), elf_sha256: createHash("sha256").update(elf).digest("hex"),
    deployed_slot: Number(programData.data.readBigUInt64LE(4)) });
}
console.log(JSON.stringify({ genesis_hash: manifest.genesis_hash, programs: results }, null, 2));

