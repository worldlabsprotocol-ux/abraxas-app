// FILE: lib/passport/productionReconciliationInventoryEvidence.ts

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { HolderReconciliationInventory } from "./productionHolderReconciliationInventory";
import { PRODUCTION_SUPABASE_PROJECT_REF } from "./productionMigrationRelease";
import type { LoadedProductionPreflight } from "./productionPreflightEvidence";
import { loadProductionPreflightEvidence } from "./productionPreflightEvidence";

export const PRODUCTION_INVENTORY_JSON_PATH_ENV = "ABRAXAS_PRODUCTION_RECONCILIATION_INVENTORY_JSON_PATH";
export const PRODUCTION_INVENTORY_JSON_INLINE_ENV = "ABRAXAS_PRODUCTION_RECONCILIATION_INVENTORY_JSON";
export const PRODUCTION_INVENTORY_MAX_AGE_HOURS_ENV = "ABRAXAS_PRODUCTION_RECONCILIATION_INVENTORY_MAX_AGE_HOURS";

export const PRODUCTION_INVENTORY_ENVELOPE_BUILD = 581 as const;
export const PRODUCTION_INVENTORY_ENVELOPE_VERSION = 1 as const;

const DEFAULT_MAX_AGE_HOURS = 6;
const FUTURE_SKEW_MS = 5 * 60 * 1000;

const REQUIRED_INVENTORY_KEYS: (keyof HolderReconciliationInventory)[] = [
  "captured_at",
  "approved_sui_idv_eligible",
  "pending_review_idv",
  "rejected_or_expired_idv",
  "idv_with_canonical_subject",
  "verified_wallet_bindings",
  "legacy_links_present",
  "canonical_subjects_present",
  "sui_unlinked_not_approved",
  "approved_unlinked_needs_reconciliation",
  "zklogin_continuity_records",
  "ambiguous_mapping_blocked",
];

export type ProductionReconciliationInventoryEnvelope = {
  build: typeof PRODUCTION_INVENTORY_ENVELOPE_BUILD;
  envelope_version: typeof PRODUCTION_INVENTORY_ENVELOPE_VERSION;
  status: "ok";
  capture_status: "complete";
  generated_at: string;
  expected_production_ref: string;
  derived_database_ref: string;
  /** ISO timestamp of the linked Build #580 preflight probe captured_at. */
  linked_preflight_captured_at: string;
  inventory: HolderReconciliationInventory;
};

export type LoadedReconciliationInventoryEvidence = {
  envelope: ProductionReconciliationInventoryEnvelope;
  inventory: HolderReconciliationInventory;
  capturedAtMs: number;
  source: "inline_env" | "file_path";
  ageHours: number;
  stale: boolean;
  derivedDatabaseRef: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function inventoryMaxAgeMs(env: Record<string, string | undefined>): number {
  const raw = env[PRODUCTION_INVENTORY_MAX_AGE_HOURS_ENV]?.trim();
  const hours = raw ? Number(raw) : DEFAULT_MAX_AGE_HOURS;
  if (!Number.isFinite(hours) || hours <= 0) return DEFAULT_MAX_AGE_HOURS * 60 * 60 * 1000;
  return hours * 60 * 60 * 1000;
}

function validateInventoryShape(inventory: unknown): inventory is HolderReconciliationInventory {
  if (!isRecord(inventory)) return false;
  for (const key of REQUIRED_INVENTORY_KEYS) {
    if (!(key in inventory)) return false;
  }
  const numericKeys: (keyof HolderReconciliationInventory)[] = [
    "approved_sui_idv_eligible",
    "pending_review_idv",
    "rejected_or_expired_idv",
    "idv_with_canonical_subject",
    "sui_unlinked_not_approved",
    "approved_unlinked_needs_reconciliation",
    "ambiguous_mapping_blocked",
  ];
  for (const key of numericKeys) {
    const value = inventory[key];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return false;
  }
  return typeof inventory.captured_at === "string" && inventory.captured_at.trim().length > 0;
}

export function validateProductionReconciliationInventoryEnvelope(raw: unknown):
  | { ok: true; envelope: ProductionReconciliationInventoryEnvelope; capturedAtMs: number }
  | { ok: false; code: string; detail: string } {
  if (!isRecord(raw)) {
    return { ok: false, code: "inventory_not_object", detail: "Inventory payload must be a JSON object." };
  }
  if (raw.build !== PRODUCTION_INVENTORY_ENVELOPE_BUILD) {
    return { ok: false, code: "inventory_build_mismatch", detail: "Expected Build #581 inventory envelope." };
  }
  if (raw.envelope_version !== PRODUCTION_INVENTORY_ENVELOPE_VERSION) {
    return { ok: false, code: "inventory_version_mismatch", detail: "Unsupported inventory envelope version." };
  }
  if (raw.status !== "ok" || raw.capture_status !== "complete") {
    return { ok: false, code: "inventory_capture_incomplete", detail: "Inventory capture_status must be complete." };
  }
  if (raw.expected_production_ref !== PRODUCTION_SUPABASE_PROJECT_REF) {
    return { ok: false, code: "inventory_target_mismatch", detail: "Inventory expected Production ref mismatch." };
  }
  if (raw.derived_database_ref !== PRODUCTION_SUPABASE_PROJECT_REF) {
    return { ok: false, code: "inventory_database_identity_mismatch", detail: "Inventory derived database ref invalid." };
  }
  const linkedPreflight = String(raw.linked_preflight_captured_at ?? "").trim();
  if (!linkedPreflight) {
    return { ok: false, code: "inventory_preflight_link_missing", detail: "Inventory must link to preflight captured_at." };
  }
  if (!validateInventoryShape(raw.inventory)) {
    return { ok: false, code: "inventory_shape_invalid", detail: "Aggregate inventory structure is invalid." };
  }
  const capturedAtMs = Date.parse(raw.inventory.captured_at);
  if (!Number.isFinite(capturedAtMs)) {
    return { ok: false, code: "inventory_invalid_captured_at", detail: "Inventory captured_at is not parseable." };
  }
  if (capturedAtMs > Date.now() + FUTURE_SKEW_MS) {
    return { ok: false, code: "inventory_future_dated", detail: "Inventory captured_at is in the future." };
  }
  return {
    ok: true,
    envelope: raw as ProductionReconciliationInventoryEnvelope,
    capturedAtMs,
  };
}

export function buildTestReconciliationInventoryEnvelope(input: {
  inventory: HolderReconciliationInventory;
  linkedPreflightCapturedAt: string;
}): ProductionReconciliationInventoryEnvelope {
  return {
    build: PRODUCTION_INVENTORY_ENVELOPE_BUILD,
    envelope_version: PRODUCTION_INVENTORY_ENVELOPE_VERSION,
    status: "ok",
    capture_status: "complete",
    generated_at: new Date().toISOString(),
    expected_production_ref: PRODUCTION_SUPABASE_PROJECT_REF,
    derived_database_ref: PRODUCTION_SUPABASE_PROJECT_REF,
    linked_preflight_captured_at: input.linkedPreflightCapturedAt,
    inventory: input.inventory,
  };
}

export function loadProductionReconciliationInventoryEvidence(
  env: Record<string, string | undefined> = process.env,
):
  | { ok: true; evidence: LoadedReconciliationInventoryEvidence }
  | { ok: false; code: string; detail: string } {
  const inline = env[PRODUCTION_INVENTORY_JSON_INLINE_ENV]?.trim();
  const path = env[PRODUCTION_INVENTORY_JSON_PATH_ENV]?.trim();
  let raw: string | null = inline || null;
  let source: LoadedReconciliationInventoryEvidence["source"] = "inline_env";

  if (!raw && path) {
    try {
      raw = readFileSync(path, "utf8");
      source = "file_path";
    } catch {
      return { ok: false, code: "inventory_missing", detail: "Inventory JSON file could not be read." };
    }
  }

  if (!raw) {
    return {
      ok: false,
      code: "inventory_missing",
      detail: "Set inventory JSON path or inline env after running read-only reconciliation inventory.",
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, code: "inventory_invalid_json", detail: "Inventory payload is not valid JSON." };
  }

  const validated = validateProductionReconciliationInventoryEnvelope(parsed);
  if (!validated.ok) return validated;

  const preflight = loadProductionPreflightEvidence(env);
  if (!preflight.ok) {
    return {
      ok: false,
      code: "inventory_preflight_required",
      detail: "Valid preflight evidence must be loaded before inventory evidence.",
    };
  }

  const linked = validated.envelope.linked_preflight_captured_at.trim();
  const expectedLink = probe580CapturedAtFromPreflight(preflight.evidence);
  if (linked !== expectedLink) {
    return {
      ok: false,
      code: "inventory_preflight_link_mismatch",
      detail: "Inventory linked_preflight_captured_at does not match loaded preflight evidence.",
    };
  }

  if (validated.envelope.derived_database_ref !== preflight.evidence.derivedDatabaseRef) {
    return {
      ok: false,
      code: "inventory_preflight_database_mismatch",
      detail: "Inventory and preflight database identity evidence disagree.",
    };
  }

  const maxAgeMs = inventoryMaxAgeMs(env);
  const ageMs = Date.now() - validated.capturedAtMs;
  const stale = ageMs > maxAgeMs;

  return {
    ok: true,
    evidence: {
      envelope: validated.envelope,
      inventory: validated.envelope.inventory,
      capturedAtMs: validated.capturedAtMs,
      source,
      ageHours: ageMs / (60 * 60 * 1000),
      stale,
      derivedDatabaseRef: validated.envelope.derived_database_ref,
    },
  };
}

function probe580CapturedAtFromPreflight(preflight: LoadedProductionPreflight): string {
  const report = preflight.report as { captured_at?: string };
  return report.captured_at?.trim() ?? new Date(preflight.capturedAtMs).toISOString();
}

export function preflightEnvelopeDigest(json: string): string {
  return createHash("sha256").update(json.trim(), "utf8").digest("hex");
}
