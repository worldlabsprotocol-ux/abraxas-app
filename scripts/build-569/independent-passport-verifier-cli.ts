#!/usr/bin/env npx tsx
// FILE: scripts/build-569/independent-passport-verifier-cli.ts
// External institutional verifier: no Abraxas identity database.

import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  verifyPassportInstitutionalBundleIndependently,
  type PassportInstitutionalVerificationBundle,
} from "@/lib/passport/reusableCredential/independentPassportVerifier";
import { FileReceiptConsumptionStore } from "@/lib/institutionalCertification/build547/receiptConsumptionStore";

function usage() {
  console.error(`Usage: independent-passport-verifier-cli.ts <bundle.json> [--trust-env <public-trust.json>] [--consumption-dir <path>] [--checkpoint-dir <path>]`);
  process.exit(2);
}

async function main() {
  const args = process.argv.slice(2);
  if (!args[0]) usage();
  const bundlePath = args[0];
  let trustEnvPath: string | undefined;
  let consumptionDir: string | undefined;
  let checkpointDir: string | undefined;
  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--trust-env" && args[i + 1]) {
      trustEnvPath = args[++i];
    } else if (args[i] === "--consumption-dir" && args[i + 1]) {
      consumptionDir = args[++i];
    } else if (args[i] === "--checkpoint-dir" && args[i + 1]) {
      checkpointDir = args[++i];
    }
  }

  const bundle = JSON.parse(readFileSync(bundlePath, "utf8")) as PassportInstitutionalVerificationBundle;
  const env: Record<string, string> = trustEnvPath
    ? (JSON.parse(readFileSync(trustEnvPath, "utf8")) as Record<string, string>)
    : {};

  for (const key of [
    "ABRAXAS_RECEIPT_VERIFICATION_REGISTRY",
    "ABRAXAS_PASSPORT_CREDENTIAL_ISSUER_REGISTRY",
    "ABRAXAS_RECEIPT_KEY_ENVIRONMENT",
    "ABRAXAS_SIGNING_KEY_ID",
  ]) {
    if (process.env[key] && !env[key]) env[key] = process.env[key]!;
  }

  let consumptionStore;
  if (consumptionDir) {
    if (!existsSync(consumptionDir)) mkdirSync(consumptionDir, { recursive: true });
    consumptionStore = new FileReceiptConsumptionStore(consumptionDir);
  }

  const result = await verifyPassportInstitutionalBundleIndependently(bundle, {
    env,
    consumptionStore,
    checkpointDir,
  });

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
