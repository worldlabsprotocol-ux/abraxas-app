#!/usr/bin/env bash
# Prove @abraxas/independent-verifier installs and verifies outside the monorepo tree.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/artifacts/npm"
TGZ=$(ls -1 "$OUT"/abraxas-independent-verifier-*.tgz 2>/dev/null | sort -V | tail -1)

if [[ -z "${TGZ}" || ! -f "${TGZ}" ]]; then
  echo "Run npm run build831:pack-verifier first" >&2
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cp "$TGZ" "$TMP/verifier.tgz"
cp "$ROOT/examples/integration-first-relying-party/fixtures/trust-anchor-bundle.json" "$TMP/trust-anchor.json"
cp "$ROOT/examples/integration-first-relying-party/fixtures/decision-receipt.json" "$TMP/decision-receipt.json"
cp "$ROOT/examples/integration-first-relying-party/fixtures/issuer-authority-statement.json" "$TMP/issuer-authority.json"
cp "$ROOT/examples/integration-first-relying-party/fixtures/signed-status-statement.json" "$TMP/signed-status.json"

cat > "$TMP/package.json" <<'JSON'
{
  "name": "abraxas-external-install-proof",
  "private": true,
  "type": "module",
  "dependencies": {
    "@abraxas/independent-verifier": "file:./verifier.tgz"
  }
}
JSON

cat > "$TMP/prove.mjs" <<'JS'
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import {
  verifyAbraxasReceiptIndependently,
  validateTrustAnchorBundle,
} from "@abraxas/independent-verifier";

const pin = JSON.parse(readFileSync("trust-anchor.json", "utf8"));
const validated = validateTrustAnchorBundle(pin);
if (!validated.ok) throw new Error(validated.reason);

const record = JSON.parse(readFileSync("decision-receipt.json", "utf8"));
const signedIssuerAuthority = JSON.parse(readFileSync("issuer-authority.json", "utf8"));
const signedStatusStatement = JSON.parse(readFileSync("signed-status.json", "utf8"));

const result = verifyAbraxasReceiptIndependently({
  record,
  pinnedTrustAnchor: pin,
  signedIssuerAuthority,
  signedStatusStatement,
  relyingParty: {
    partner_id: record.partner_id,
    policy_id: record.policy_id,
    environment: "demo",
  },
  statementObservedAt: new Date().toISOString(),
});

if (!result.cryptographically_authentic || !result.status_evidence_authentic) {
  console.error(JSON.stringify(result, null, 2));
  throw new Error("verify_failed");
}

const checkpointPath = "checkpoint.json";
let minStatus = 0;
if (existsSync(checkpointPath)) {
  minStatus = JSON.parse(readFileSync(checkpointPath, "utf8")).minimum_status_version ?? 0;
}
if (signedStatusStatement.payload.status_version < minStatus) {
  throw new Error("checkpoint_rollback");
}
writeFileSync(
  checkpointPath,
  JSON.stringify({
    checkpoint_schema: "abraxas_partner_status_checkpoint/1.0.0",
    minimum_status_version: Math.max(minStatus, signedStatusStatement.payload.status_version),
    minimum_registry_version: signedIssuerAuthority.payload.registry_version,
    last_authenticated_at: new Date().toISOString(),
  }),
  "utf8",
);

console.log(JSON.stringify({ ok: true, currently_acceptable: result.currently_acceptable }, null, 2));
JS

cd "$TMP"
npm install --silent
node prove.mjs
node prove.mjs

echo "OK: external install proof in $TMP (destroyed on exit)"
