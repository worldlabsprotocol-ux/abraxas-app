// FILE: lib/passport/productionPreflightEvidence.ts

import { readFileSync } from "node:fs";
import type { ProductionMigrationPreflightReport } from "./productionMigrationRelease";
import { validateProductionPreflightEnvelope } from "./productionPreflightEnvelope";

export const PRODUCTION_PREFLIGHT_JSON_PATH_ENV = "ABRAXAS_PRODUCTION_PREFLIGHT_JSON_PATH";
export const PRODUCTION_PREFLIGHT_JSON_INLINE_ENV = "ABRAXAS_PRODUCTION_PREFLIGHT_JSON";
export const PRODUCTION_PREFLIGHT_MAX_AGE_HOURS_ENV = "ABRAXAS_PRODUCTION_PREFLIGHT_MAX_AGE_HOURS";

const DEFAULT_MAX_AGE_HOURS = 6;

export type LoadedProductionPreflight = {
  report: ProductionMigrationPreflightReport;
  capturedAtMs: number;
  source: "inline_env" | "file_path";
  ageHours: number;
  stale: boolean;
  derivedDatabaseRef: string;
};

export function productionPreflightMaxAgeMs(env: Record<string, string | undefined> = process.env): number {
  const raw = env[PRODUCTION_PREFLIGHT_MAX_AGE_HOURS_ENV]?.trim();
  const hours = raw ? Number(raw) : DEFAULT_MAX_AGE_HOURS;
  if (!Number.isFinite(hours) || hours <= 0) return DEFAULT_MAX_AGE_HOURS * 60 * 60 * 1000;
  return hours * 60 * 60 * 1000;
}

export function loadProductionPreflightEvidence(
  env: Record<string, string | undefined> = process.env,
):
  | { ok: true; evidence: LoadedProductionPreflight }
  | { ok: false; code: string; detail: string } {
  const inline = env[PRODUCTION_PREFLIGHT_JSON_INLINE_ENV]?.trim();
  const path = env[PRODUCTION_PREFLIGHT_JSON_PATH_ENV]?.trim();
  let raw: string | null = inline || null;
  let source: LoadedProductionPreflight["source"] = "inline_env";

  if (!raw && path) {
    try {
      raw = readFileSync(path, "utf8");
      source = "file_path";
    } catch {
      return { ok: false, code: "preflight_missing", detail: "Preflight JSON file could not be read." };
    }
  }

  if (!raw) {
    return {
      ok: false,
      code: "preflight_missing",
      detail: "Set ABRAXAS_PRODUCTION_PREFLIGHT_JSON_PATH or ABRAXAS_PRODUCTION_PREFLIGHT_JSON after running read-only probes.",
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, code: "preflight_invalid_json", detail: "Preflight payload is not valid JSON." };
  }

  const validated = validateProductionPreflightEnvelope(parsed);
  if (!validated.ok) {
    return validated;
  }

  const maxAgeMs = productionPreflightMaxAgeMs(env);
  const ageMs = Date.now() - validated.evidence.capturedAtMs;
  const ageHours = ageMs / (60 * 60 * 1000);
  const stale = ageMs > maxAgeMs;

  return {
    ok: true,
    evidence: {
      report: validated.evidence.report,
      capturedAtMs: validated.evidence.capturedAtMs,
      source,
      ageHours,
      stale,
      derivedDatabaseRef: validated.evidence.derivedDatabaseRef,
    },
  };
}
