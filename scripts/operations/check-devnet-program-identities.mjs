// Read-only identity gate. Run in the authorized operator environment to confirm
// that public program IDs in the build agree with the locally held signers.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = new URL("../../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

export function extractIdentity(source, expression, location) {
  const match = source.match(expression);
  if (!match) throw new Error(`Missing program identity in ${location}`);
  return match[1];
}

export function assertIdentityLayout({ name, status, anchorId, sourceId, clientId, manifestId }) {
  if (anchorId !== sourceId) throw new Error(`${name} identity differs between Anchor and program source`);
  if (status === "pending_public_ids" && sourceId !== clientId) {
    throw new Error(`${name} unapproved identity differs from historical client pin`);
  }
  if (status === "approved"
    && (typeof manifestId !== "string" || sourceId !== manifestId || sourceId === clientId)) {
    throw new Error(`${name} approved Devnet identity is missing or differs from program source`);
  }
}

export function checkSourceIdentities() {
  const anchor = read("solana/abraxas-eligibility-gate/Anchor.toml");
  const manifest = JSON.parse(read("solana/abraxas-eligibility-gate/release/devnet-entitlement-identity.json"));
  if (!["pending_public_ids", "approved"].includes(manifest.status)) throw new Error("Invalid Devnet identity status");
  if (manifest.status === "pending_public_ids"
    && (manifest.proof_continuity_program_id !== null || manifest.entitlement_consumer_program_id !== null)) {
    throw new Error("Pending Devnet identity cannot contain partial program IDs");
  }
  const programs = [
    {
      name: "proof continuity",
      anchor: "abraxas_proof_continuity",
      source: "solana/abraxas-eligibility-gate/programs/abraxas-proof-continuity/src/lib.rs",
      client: "lib/solana/proofContinuity/constants.ts",
      clientName: "PROOF_CONTINUITY_PROGRAM_ID",
      signerEnv: "ABRAXAS_DEVNET_PROOF_CONTINUITY_KEYPAIR",
      manifestName: "proof_continuity_program_id",
    },
    {
      name: "entitlement consumer",
      anchor: "abraxas_proof_entitlement_consumer",
      source: "solana/abraxas-eligibility-gate/programs/abraxas-proof-entitlement-consumer/src/lib.rs",
      client: "lib/solana/token2022Entitlement/constants.ts",
      clientName: "ENTITLEMENT_CONSUMER_PROGRAM_ID",
      signerEnv: "ABRAXAS_DEVNET_ENTITLEMENT_CONSUMER_KEYPAIR",
      manifestName: "entitlement_consumer_program_id",
    },
  ];

  const identities = programs.map((program) => {
    const anchorId = extractIdentity(anchor, new RegExp(`^${program.anchor}\\s*=\\s*"([^"]+)"`, "m"), "Anchor.toml");
    const sourceId = extractIdentity(read(program.source), /declare_id!\("([^"]+)"\)/, program.source);
    const clientId = extractIdentity(
      read(program.client),
      new RegExp(`\\b${program.clientName}\\s*=\\s*"([^"]+)"`),
      program.client,
    );
    const manifestId = manifest[program.manifestName];
    assertIdentityLayout({ name: program.name, status: manifest.status, anchorId, sourceId, clientId, manifestId });
    return { ...program, id: anchorId, historicalId: clientId };
  });
  if (identities[0].id === identities[1].id) throw new Error("Both programs use the same identity");
  const kit = read("lib/partner/testnetGateDeploymentKit/contract.ts");
  const kitId = extractIdentity(kit, /abraxas_proof_continuity:\s*"([^"]+)"/, "deployment kit");
  if (kitId !== identities[0].historicalId) throw new Error("Historical deployment kit differs from client pin");
  return identities;
}

export function checkSignerCustody(identities, env = process.env, derivePublicKey = (path) =>
  execFileSync("solana-keygen", ["pubkey", path], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim()) {
  const paths = identities.map(({ signerEnv }) => env[signerEnv]?.trim());
  if (paths.some(Boolean) && !paths.every(Boolean)) throw new Error("Both program signers are required for custody confirmation");
  if (!paths.every(Boolean)) return false;
  for (let i = 0; i < identities.length; i += 1) {
    let derived;
    try {
      derived = derivePublicKey(paths[i]);
    } catch {
      throw new Error(`Could not derive ${identities[i].name} public key in the operator environment`);
    }
    if (derived !== identities[i].id) throw new Error(`${identities[i].name} signer does not match the declared program ID`);
  }
  return true;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const identities = checkSourceIdentities();
    const custody = checkSignerCustody(identities);
    console.log(`Program source identities agree. Signer custody: ${custody ? "confirmed locally" : "unconfirmed"}.`);
    if (!custody) process.exitCode = 2;
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Identity check failed");
    process.exitCode = 1;
  }
}
