#!/usr/bin/env npx tsx
/** Writes public synthetic fixtures into the SDK package (no private signing keys shipped). */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  build546SampleRecord,
  build546TrustRegistryEnv,
  BUILD_546_PARTNER_ID,
  BUILD_546_POLICY_ID,
} from "@/lib/institutionalCertification/build546/fixtures";
import {
  validateInstitutionReceiptVerificationRegistryJson,
} from "@/lib/institutionalVerification/trustMaterial";

const SYNTHETIC_NOTICE =
  "**SYNTHETIC TEST DATA ONLY** — not Abraxas production issuer material. Do not deploy to production.";

const outDir = join(process.cwd(), "packages/abraxas-institutional-verification/fixtures/synthetic");
mkdirSync(outDir, { recursive: true });

const env = build546TrustRegistryEnv();
const validated = validateInstitutionReceiptVerificationRegistryJson(env.ABRAXAS_RECEIPT_VERIFICATION_REGISTRY);
if (!validated.ok) {
  throw new Error(`registry invalid: ${validated.code}`);
}

writeFileSync(join(outDir, "trust-registry.json"), validated.registry_env_value, "utf8");
writeFileSync(join(outDir, "trust-digest-v2.txt"), `${validated.digest}\n`, "utf8");

const record = build546SampleRecord();
writeFileSync(join(outDir, "signed-receipt.valid.json"), JSON.stringify(record, null, 2), "utf8");

writeFileSync(
  join(outDir, "README.md"),
  `# Synthetic SDK fixtures

${SYNTHETIC_NOTICE}

- \`trust-registry.json\` — public verification keys only (demo environment)
- \`trust-digest-v2.txt\` — digest v2 pin for network bootstrap tests
- \`signed-receipt.valid.json\` — pre-signed decision receipt (partner \`${BUILD_546_PARTNER_ID}\`, policy \`${BUILD_546_POLICY_ID}\`)

Generate with: \`npm run sdk:fixtures\`
`,
  "utf8",
);

console.log(`Wrote synthetic fixtures to ${outDir}`);
