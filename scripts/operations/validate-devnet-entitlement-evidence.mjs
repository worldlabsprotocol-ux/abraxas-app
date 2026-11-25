// Check that the public post-deployment record binds the reviewed binaries,
// on-chain verification result, authority and Devnet identity pair together.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const names = ["abraxas_proof_continuity", "abraxas_proof_entitlement_consumer"];
const authority = "3cKi3oxEoFDZ7corbQ1Uk21gxqdgPu3LpH4MN313EnRd";
const sha256 = /^[0-9a-f]{64}$/;
const publicId = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const signature = /^[1-9A-HJ-NP-Za-km-z]{80,88}$/;

export function validateDevnetEntitlementEvidence({ manifest, quote, verification }) {
  if (manifest.status !== "approved" || manifest.genesis_hash !== quote.genesis_hash
      || manifest.genesis_hash !== verification.genesis_hash) throw new Error("Devnet genesis or approval mismatch");
  const ids = [manifest.proof_continuity_program_id, manifest.entitlement_consumer_program_id];
  if (ids.some((id) => typeof id !== "string" || !publicId.test(id)) || ids[0] === ids[1]) {
    throw new Error("Invalid or duplicate public program IDs");
  }
  if (!Array.isArray(quote.binaries) || quote.binaries.length !== 2
      || !Array.isArray(verification.programs) || verification.programs.length !== 2) {
    throw new Error("Incomplete program evidence");
  }
  for (const [index, name] of names.entries()) {
    const binary = quote.binaries.find((entry) => entry.name === name);
    const program = verification.programs.find((entry) => entry.name === name);
    if (!binary || !program || program.program_id !== ids[index]
        || !sha256.test(binary.sha256) || binary.sha256 !== program.elf_sha256
        || program.upgrade_authority !== authority
        || !Number.isSafeInteger(program.deployed_slot) || program.deployed_slot <= 0
        || !Array.isArray(program.finalized_program_data_signatures)
        || program.finalized_program_data_signatures.length === 0
        || program.finalized_program_data_signatures.some((entry) =>
          typeof entry.signature !== "string" || !signature.test(entry.signature)
          || !Number.isSafeInteger(entry.slot) || entry.slot <= 0)) {
      throw new Error(`Invalid public deployment evidence for ${name}`);
    }
  }
  return { genesis_hash: manifest.genesis_hash, program_ids: ids };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = process.argv[2] ? resolve(process.argv[2]) : fileURLToPath(new URL("../..", import.meta.url));
  const release = resolve(root, "solana/abraxas-eligibility-gate/release");
  const read = (name) => JSON.parse(readFileSync(resolve(release, name), "utf8"));
  console.log(JSON.stringify(validateDevnetEntitlementEvidence({
    manifest: read("devnet-entitlement-identity.json"),
    quote: read("devnet-entitlement-quote.json"),
    verification: read("devnet-entitlement-verification.json"),
  })));
}

