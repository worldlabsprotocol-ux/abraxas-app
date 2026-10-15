// FILE: lib/passport/productionPreflightEnvelope.ts
// Validated Build #581 read-only preflight evidence contract.

import {
  isProductionPreflightReportComplete,
  PRODUCTION_SUPABASE_PROJECT_REF,
  type ProductionMigrationPreflightReport,
} from "./productionMigrationRelease";

export const PRODUCTION_PREFLIGHT_ENVELOPE_BUILD = 581 as const;
export const PRODUCTION_PREFLIGHT_ENVELOPE_VERSION = 1 as const;
export const PRODUCTION_PREFLIGHT_PROBE_580_KEY =
  "scripts/build-580/production-migration-release-gates.sql" as const;

const FUTURE_SKEW_MS = 5 * 60 * 1000;

export type ProductionPreflightEnvelope = {
  build: typeof PRODUCTION_PREFLIGHT_ENVELOPE_BUILD;
  envelope_version: typeof PRODUCTION_PREFLIGHT_ENVELOPE_VERSION;
  status: "ok";
  generated_at: string;
  canonical_product_url: string;
  expected_production_ref: string;
  derived_database_ref: string;
  hybrid_binding: { ok: true; binding_mode: string; direct_project_ref: string; postgrest_project_ref: string };
  probes: Record<string, unknown>;
  release_gates_report: ProductionMigrationPreflightReport & { captured_at?: string };
};

export type ValidatedPreflightEvidence = {
  envelope: ProductionPreflightEnvelope;
  report: ProductionMigrationPreflightReport;
  capturedAtMs: number;
  derivedDatabaseRef: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractProbe580Report(probes: Record<string, unknown>): (ProductionMigrationPreflightReport & { captured_at?: string }) | null {
  const raw = probes[PRODUCTION_PREFLIGHT_PROBE_580_KEY];
  if (!isRecord(raw)) return null;
  return raw as ProductionMigrationPreflightReport & { captured_at?: string };
}

export function validateProductionPreflightEnvelope(raw: unknown):
  | { ok: true; evidence: ValidatedPreflightEvidence }
  | { ok: false; code: string; detail: string } {
  if (!isRecord(raw)) {
    return { ok: false, code: "preflight_not_object", detail: "Preflight payload must be a JSON object." };
  }

  if (raw.build !== PRODUCTION_PREFLIGHT_ENVELOPE_BUILD) {
    return { ok: false, code: "preflight_build_mismatch", detail: "Expected Build #581 preflight envelope." };
  }
  if (raw.envelope_version !== PRODUCTION_PREFLIGHT_ENVELOPE_VERSION) {
    return { ok: false, code: "preflight_version_mismatch", detail: "Unsupported preflight envelope version." };
  }
  if (raw.status !== "ok") {
    return { ok: false, code: "preflight_status_not_ok", detail: "Preflight envelope status must be ok." };
  }
  if (raw.expected_production_ref !== PRODUCTION_SUPABASE_PROJECT_REF) {
    return { ok: false, code: "preflight_target_mismatch", detail: "Expected Production project ref mismatch." };
  }
  if (raw.derived_database_ref !== PRODUCTION_SUPABASE_PROJECT_REF) {
    return { ok: false, code: "preflight_database_identity_mismatch", detail: "Derived database ref must match Production." };
  }
  if (!isRecord(raw.hybrid_binding) || raw.hybrid_binding.ok !== true) {
    return { ok: false, code: "preflight_hybrid_binding_invalid", detail: "Hybrid binding evidence missing or not ok." };
  }

  const probes = isRecord(raw.probes) ? raw.probes : null;
  if (!probes) {
    return { ok: false, code: "preflight_probes_missing", detail: "Probe results are required." };
  }

  const probe580 = extractProbe580Report(probes);
  if (!probe580) {
    return { ok: false, code: "preflight_probe_580_missing", detail: "Build #580 release gates probe result is required." };
  }

  const embedded = isRecord(raw.release_gates_report) ? raw.release_gates_report : probe580;
  if (JSON.stringify(embedded) !== JSON.stringify(probe580)) {
    return { ok: false, code: "preflight_probe_580_mismatch", detail: "release_gates_report must match Build #580 probe output." };
  }

  if (!isProductionPreflightReportComplete(probe580)) {
    return { ok: false, code: "preflight_report_incomplete", detail: "Build #580 probe report missing required schema sections." };
  }

  if (probe580.project_ref_expected && probe580.project_ref_expected !== PRODUCTION_SUPABASE_PROJECT_REF) {
    return { ok: false, code: "preflight_forged_project_ref", detail: "Probe self-declared project ref contradicts Production target." };
  }

  const capturedRaw = probe580.captured_at?.trim();
  if (!capturedRaw) {
    return { ok: false, code: "preflight_missing_captured_at", detail: "Probe captured_at is required." };
  }
  const capturedAtMs = Date.parse(capturedRaw);
  if (!Number.isFinite(capturedAtMs)) {
    return { ok: false, code: "preflight_invalid_captured_at", detail: "Probe captured_at is not parseable." };
  }
  if (capturedAtMs > Date.now() + FUTURE_SKEW_MS) {
    return { ok: false, code: "preflight_future_dated", detail: "Probe captured_at is in the future." };
  }

  const envelope = raw as ProductionPreflightEnvelope;
  envelope.release_gates_report = probe580;

  return {
    ok: true,
    evidence: {
      envelope,
      report: probe580,
      capturedAtMs,
      derivedDatabaseRef: PRODUCTION_SUPABASE_PROJECT_REF,
    },
  };
}

/** Build a valid envelope for tests from a complete #580 probe report and binding stub. */
export function buildTestPreflightEnvelope(
  probe580Report: ProductionMigrationPreflightReport & { captured_at?: string },
): ProductionPreflightEnvelope {
  return {
    build: PRODUCTION_PREFLIGHT_ENVELOPE_BUILD,
    envelope_version: PRODUCTION_PREFLIGHT_ENVELOPE_VERSION,
    status: "ok",
    generated_at: new Date().toISOString(),
    canonical_product_url: "https://abraxasworld.xyz",
    expected_production_ref: PRODUCTION_SUPABASE_PROJECT_REF,
    derived_database_ref: PRODUCTION_SUPABASE_PROJECT_REF,
    hybrid_binding: {
      ok: true,
      binding_mode: "supabase_dual_identity",
      direct_project_ref: PRODUCTION_SUPABASE_PROJECT_REF,
      postgrest_project_ref: PRODUCTION_SUPABASE_PROJECT_REF,
    },
    probes: {
      [PRODUCTION_PREFLIGHT_PROBE_580_KEY]: probe580Report,
    },
    release_gates_report: probe580Report,
  };
}
