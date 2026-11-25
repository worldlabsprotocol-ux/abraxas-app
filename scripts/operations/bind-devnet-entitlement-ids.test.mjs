import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bindDevnetIdentities } from "./bind-devnet-entitlement-ids.mjs";

const root = fileURLToPath(new URL("../..", import.meta.url));
const paths = [
  "solana/abraxas-eligibility-gate/release/devnet-entitlement-identity.json",
  "solana/abraxas-eligibility-gate/Anchor.toml",
  "solana/abraxas-eligibility-gate/programs/abraxas-proof-continuity/src/lib.rs",
  "solana/abraxas-eligibility-gate/programs/abraxas-proof-entitlement-consumer/src/lib.rs",
];
const proof = "11111111111111111111111111111111";
const consumer = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const fixture = () => {
  const files = new Map(paths.map((path) => [path, readFileSync(resolve(root, path), "utf8")]));
  const manifest = JSON.parse(files.get(paths[0]));
  manifest.status = "pending_public_ids";
  manifest.proof_continuity_program_id = null;
  manifest.entitlement_consumer_program_id = null;
  files.set(paths[0], JSON.stringify(manifest));
  return files;
};
const run = (files, proofId = proof, consumerId = consumer) => bindDevnetIdentities({
  proofId, consumerId,
  read: (path) => files.get(path), write: (path, content) => files.set(path, content),
});

test("binds both Devnet identities and preserves historical client pins", () => {
  const files = fixture();
  const result = run(files);
  assert.equal(result.status, "approved");
  assert.equal(result.proof_continuity_program_id, proof);
  assert.equal(result.entitlement_consumer_program_id, consumer);
  assert.match(files.get(paths[2]), new RegExp(`declare_id!\\("${proof}"\\)`));
  assert.match(files.get(paths[3]), new RegExp(`declare_id!\\("${consumer}"\\)`));
  assert.equal(files.size, 4);
});

test("rejects duplicate and invalid IDs without a partial write", () => {
  for (const ids of [[proof, proof], ["invalid", consumer]]) {
    const files = fixture();
    assert.throws(() => run(files, ...ids));
    assert.equal(JSON.parse(files.get(paths[0])).status, "pending_public_ids");
  }
});

test("refuses an already approved or partially bound manifest", () => {
  const files = fixture();
  const manifest = JSON.parse(files.get(paths[0]));
  manifest.proof_continuity_program_id = proof;
  files.set(paths[0], JSON.stringify(manifest));
  assert.throws(() => run(files), /not pending/);
});

