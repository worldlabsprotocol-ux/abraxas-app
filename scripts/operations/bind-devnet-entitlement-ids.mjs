// Bind freshly derived Devnet program IDs in an isolated deployment checkout.
// Historical client pins remain unchanged; the manifest selects the new IDs.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const manifestPath = "solana/abraxas-eligibility-gate/release/devnet-entitlement-identity.json";
const anchorPath = "solana/abraxas-eligibility-gate/Anchor.toml";
const programs = [
  {
    key: "proof_continuity_program_id",
    anchor: "abraxas_proof_continuity",
    source: "solana/abraxas-eligibility-gate/programs/abraxas-proof-continuity/src/lib.rs",
  },
  {
    key: "entitlement_consumer_program_id",
    anchor: "abraxas_proof_entitlement_consumer",
    source: "solana/abraxas-eligibility-gate/programs/abraxas-proof-entitlement-consumer/src/lib.rs",
  },
];

export function bindDevnetIdentities({ proofId, consumerId, read, write }) {
  for (const id of [proofId, consumerId]) {
    if (typeof id !== "string" || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(id)) throw new Error("Invalid program public ID");
    let value = 0n;
    for (const char of id) value = value * 58n + BigInt("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz".indexOf(char));
    const zeros = id.match(/^1*/)[0].length;
    const bytes = (value === 0n ? 0 : Math.ceil(value.toString(16).length / 2)) + zeros;
    if (bytes !== 32) throw new Error("Invalid program public ID length");
  }
  if (proofId === consumerId) throw new Error("Program identities must differ");
  const manifest = JSON.parse(read(manifestPath));
  if (manifest.status !== "pending_public_ids" || manifest.proof_continuity_program_id !== null
      || manifest.entitlement_consumer_program_id !== null) throw new Error("Devnet identity manifest is not pending");
  let anchor = read(anchorPath);
  const updates = [];
  for (const [index, program] of programs.entries()) {
    const id = index === 0 ? proofId : consumerId;
    const oldAnchor = new RegExp(`^(${program.anchor}\\s*=\\s*)"([^"]+)"`, "m");
    const match = anchor.match(oldAnchor);
    if (!match) throw new Error(`Missing Anchor identity for ${program.anchor}`);
    const source = read(program.source);
    const sourceMatch = source.match(/declare_id!\("([^"]+)"\)/);
    if (!sourceMatch || sourceMatch[1] !== match[2] || id === match[2]) {
      throw new Error(`Historical identity mismatch for ${program.anchor}`);
    }
    anchor = anchor.replace(oldAnchor, `$1"${id}"`);
    updates.push([program.source, source.replace(/declare_id!\("[^"]+"\)/, `declare_id!("${id}")`)]);
    manifest[program.key] = id;
  }
  manifest.status = "approved";
  updates.push([anchorPath, anchor], [manifestPath, `${JSON.stringify(manifest, null, 2)}\n`]);
  for (const [path, content] of updates) write(path, content);
  return manifest;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 4) throw new Error("Usage: node bind-devnet-entitlement-ids.mjs <proof-public-id> <consumer-public-id>");
  const result = bindDevnetIdentities({
    proofId: process.argv[2], consumerId: process.argv[3],
    read: (path) => readFileSync(resolve(root, path), "utf8"),
    write: (path, content) => writeFileSync(resolve(root, path), content),
  });
  console.log(`Bound Devnet program IDs: ${result.proof_continuity_program_id} ${result.entitlement_consumer_program_id}`);
}

