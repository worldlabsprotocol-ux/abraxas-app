import test from "node:test";
import assert from "node:assert/strict";
import { checkSignerCustody, checkSourceIdentities, extractIdentity } from "./check-devnet-program-identities.mjs";

test("program source, Anchor config, client, and deployment kit agree", () => {
  const identities = checkSourceIdentities();
  assert.equal(identities.length, 2);
  assert.notEqual(identities[0].id, identities[1].id);
});

test("missing identities and incomplete signer pairs fail closed", () => {
  assert.throws(() => extractIdentity("", /declare_id!\("([^"]+)"\)/, "program"));
  const identities = checkSourceIdentities();
  assert.equal(checkSignerCustody(identities, {}), false);
  assert.throws(() => checkSignerCustody(identities, {
    [identities[0].signerEnv]: "/secure/proof.json",
  }), /Both program signers/);
});

test("custody requires both public keys derived from the supplied signer files", () => {
  const identities = checkSourceIdentities();
  const env = {
    [identities[0].signerEnv]: "/secure/proof.json",
    [identities[1].signerEnv]: "/secure/consumer.json",
  };
  assert.equal(checkSignerCustody(identities, env, (path) =>
    path === "/secure/proof.json" ? identities[0].id : identities[1].id), true);
  assert.throws(() => checkSignerCustody(identities, env, () => identities[0].id), /signer does not match/);
  assert.throws(() => checkSignerCustody(identities, env, () => { throw Error("private detail"); }),
    /Could not derive proof continuity public key/);
});
