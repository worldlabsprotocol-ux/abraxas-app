#!/usr/bin/env npx tsx
// FILE: scripts/build-876/validate-external-developer-metrics.ts
// Validates founder-filled metrics JSON (path via EXTERNAL_DEV_METRICS_JSON). Never writes secrets.

import { readFileSync } from "node:fs";
import {
  emptyExternalDeveloperMetrics,
  validateExternalDeveloperMetrics,
  type ExternalDeveloperMetrics,
} from "../../lib/commercial/pilotActivation/externalDeveloperAcceptance";

function main(): void {
  const path = process.env.EXTERNAL_DEV_METRICS_JSON?.trim();
  if (!path) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          skipped: true,
          template: "docs/integration/external-developer/EXTERNAL_DEVELOPER_ADOPTION_METRICS.template.json",
          empty: emptyExternalDeveloperMetrics(),
        },
        null,
        2,
      ),
    );
    return;
  }

  const raw = JSON.parse(readFileSync(path, "utf8")) as ExternalDeveloperMetrics;
  const result = validateExternalDeveloperMetrics(raw);
  console.log(JSON.stringify({ ok: result.ok, errors: result.errors, evidence_class: raw.evidence_class }, null, 2));
  if (!result.ok) process.exit(1);
}

main();
