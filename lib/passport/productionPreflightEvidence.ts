// FILE: lib/passport/productionPreflightEvidence.ts
// Load and validate read-only Production preflight JSON (Build #581).

import { readFileSync } from "node:fs";
import type { ProductionMigrationPreflightReport } from "./productionMigrationRelease";

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
};

export function productionPreflightMaxAgeMs(env: Record<string, string | undefined> = process.env): number {
  const raw = env[PRODUCTION_PREFLIGHT_MAX_AGE_HOURS_ENV]?.trim();
  const hours = raw ? Number(raw) : DEFAULT_MAX_AGE_HOURS;
  if (!Number.isFinite(hours) || hours <= 0) return DEFAULT_MAX_AGE_HOURS * 60 * 60 * 1000;
  return hours * 60 * 60 * 1000;
}

function parseCapturedAt(report: ProductionMigrationPreflightReport & { captured_at?: string }): number {
  const raw = report.captured_at?.trim();
  if (!raw) return 0;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : 0;
}

export function loadProductionPreflightEvidence(
  env: Record<string, string | undefined> = process.env,
):
  | { ok: true; evidence: LoadedProductionPreflight }
  | { ok: false; code: "preflight_missing" | "preflight_invalid_json"; detail: string } {
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

  let parsed: ProductionMigrationPreflightReport & { captured_at?: string };
  try {
    parsed = JSON.parse(raw) as ProductionMigrationPreflightReport & { captured_at?: string };
  } catch {
    return { ok: false, code: "preflight_invalid_json", detail: "Preflight payload is not valid JSON." };
  }

  const capturedAtMs = parseCapturedAt(parsed);
  const ageMs = capturedAtMs > 0 ? Date.now() - capturedAtMs : Number.POSITIVE_INFINITY;
  const maxAgeMs = productionPreflightMaxAgeMs(env);
  const ageHours = capturedAtMs > 0 ? ageMs / (60 * 60 * 1000) : Number.POSITIVE_INFINITY;
  const stale = capturedAtMs === 0 || ageMs > maxAgeMs;

  return {
    ok: true,
    evidence: {
      report: parsed,
      capturedAtMs,
      source,
      ageHours,
      stale,
    },
  };
}
