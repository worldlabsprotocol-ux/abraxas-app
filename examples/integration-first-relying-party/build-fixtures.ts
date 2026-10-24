#!/usr/bin/env npx tsx
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build821SyntheticFixtureSet } from "./syntheticFixtureFactory";

const dir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
mkdirSync(dir, { recursive: true });
const set = build821SyntheticFixtureSet();

writeFileSync(join(dir, "manifest.json"), JSON.stringify(set.manifest, null, 2));
writeFileSync(join(dir, "trust-anchor-bundle.json"), JSON.stringify(set.trust_anchor_bundle, null, 2));
writeFileSync(join(dir, "issuer-authority-statement.json"), JSON.stringify(set.issuer_authority_statement, null, 2));
writeFileSync(join(dir, "decision-receipt.json"), JSON.stringify(set.decision_receipt, null, 2));
writeFileSync(join(dir, "signed-status-statement.json"), JSON.stringify(set.signed_status_statement, null, 2));
writeFileSync(join(dir, "signed-status-statement-revoked.json"), JSON.stringify(set.signed_status_statement_revoked, null, 2));

console.log(JSON.stringify({ ok: true, output_dir: dir }, null, 2));
