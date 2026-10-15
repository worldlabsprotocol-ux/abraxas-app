#!/usr/bin/env npx tsx
// FILE: scripts/build-569/independent-passport-verifier-cli.ts
// External institutional verifier: no Abraxas identity database.

import { readFileSync, mkdirSync, existsSync } from "node:fs";
import {
  verifyPassportInstitutionalBundleOperational,
  type PassportInstitutionalVerificationBundle,
} from "@/lib/passport/reusableCredential/independentPassportVerifier";
import { parseIndependentInstitutionConfig } from "@/lib/passport/reusableCredential/independentInstitutionConfig";

function usage() {
  console.error(
    "Usage: independent-passport-verifier-cli.ts <bundle.json> --institution-config <institution.json> --consumption-dir <path> --checkpoint-dir <path>",
  );
  process.exit(2);
}

async function main() {
  const args = process.argv.slice(2);
  if (!args[0]) usage();
  const bundlePath = args[0];
  let institutionConfigPath: string | undefined;
  let consumptionDir: string | undefined;
  let checkpointDir: string | undefined;
  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--institution-config" && args[i + 1]) {
      institutionConfigPath = args[++i];
    } else if (args[i] === "--consumption-dir" && args[i + 1]) {
      consumptionDir = args[++i];
    } else if (args[i] === "--checkpoint-dir" && args[i + 1]) {
      checkpointDir = args[++i];
    }
  }

  if (!institutionConfigPath || !consumptionDir || !checkpointDir) {
    console.error("Missing required --institution-config, --consumption-dir, or --checkpoint-dir");
    usage();
  }

  const bundle = JSON.parse(readFileSync(bundlePath, "utf8")) as PassportInstitutionalVerificationBundle;
  const institutionRaw = JSON.parse(readFileSync(institutionConfigPath!, "utf8"));
  const institutionParsed = parseIndependentInstitutionConfig(institutionRaw);
  if (!institutionParsed.ok) {
    console.error(JSON.stringify({ ok: false, stage: "institution_config", code: institutionParsed.code }, null, 2));
    process.exit(2);
  }

  if (!existsSync(consumptionDir!)) mkdirSync(consumptionDir!, { recursive: true });
  if (!existsSync(checkpointDir!)) mkdirSync(checkpointDir!, { recursive: true });

  const result = await verifyPassportInstitutionalBundleOperational(bundle, {
    institution: institutionParsed.config,
    consumptionDir: consumptionDir!,
    checkpointDir: checkpointDir!,
  });

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
