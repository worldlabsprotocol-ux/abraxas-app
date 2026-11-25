import test from "node:test";
import assert from "node:assert/strict";
import { validateDevnetEntitlementEvidence } from "./validate-devnet-entitlement-evidence.mjs";

const proof = "FtDugarhArqNTeuGzvQhFV9wQAxTFn8bifhPrCH4dhd1";
const consumer = "CQykNfMtvoV4NV6fR3cJDB5dp5ZS7oeKh8whVwpZZc8T";
const authority = "3cKi3oxEoFDZ7corbQ1Uk21gxqdgPu3LpH4MN313EnRd";
const names = ["abraxas_proof_continuity", "abraxas_proof_entitlement_consumer"];
const fixture = () => ({
  manifest: { status: "approved", genesis_hash: "devnet", proof_continuity_program_id: proof,
    entitlement_consumer_program_id: consumer },
  quote: { genesis_hash: "devnet", binaries: names.map((name, index) => ({ name,
    sha256: String(index + 1).repeat(64) })) },
  verification: { genesis_hash: "devnet", programs: names.map((name, index) => ({ name,
    program_id: index === 0 ? proof : consumer, elf_sha256: String(index + 1).repeat(64),
    upgrade_authority: authority, deployed_slot: 12,
    finalized_program_data_signatures: [{ signature: proof, slot: 12 }] })) },
});

test("accepts a complete public binding record", () => {
  assert.deepEqual(validateDevnetEntitlementEvidence(fixture()).program_ids, [proof, consumer]);
});

test("rejects missing, stale, mismatched or unsigned public evidence", () => {
  const mutations = [
    (value) => { value.manifest.status = "pending_public_ids"; },
    (value) => { value.verification.genesis_hash = "wrong"; },
    (value) => { value.verification.programs[0].program_id = consumer; },
    (value) => { value.verification.programs[1].elf_sha256 = "f".repeat(64); },
    (value) => { value.verification.programs[1].upgrade_authority = proof; },
    (value) => { value.verification.programs[0].finalized_program_data_signatures = []; },
  ];
  for (const mutate of mutations) {
    const value = fixture();
    mutate(value);
    assert.throws(() => validateDevnetEntitlementEvidence(value));
  }
});

