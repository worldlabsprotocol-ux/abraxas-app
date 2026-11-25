// Independent RPC check: loader ownership, ProgramData authority and exact ELF bytes.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Connection, PublicKey } from "@solana/web3.js";
import { verifyDeployedProgramBytes } from "./verify-devnet-entitlement-bytes.mjs";

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
  if (!info?.data || info.data.length !== 36) throw new Error(`${name} program account invalid`);
  const programDataAddress = new PublicKey(info.data.subarray(4, 36));
  const programData = await connection.getAccountInfo(programDataAddress, "finalized");
  const elf = readFileSync(resolve(root, `solana/abraxas-eligibility-gate/target/deploy/${name}.so`));
  results.push({ name, program_id: id, ...verifyDeployedProgramBytes({
    name, programInfo: info, programDataInfo: programData, elf, expectedAuthority,
  }) });
}
console.log(JSON.stringify({ genesis_hash: manifest.genesis_hash, programs: results }, null, 2));

