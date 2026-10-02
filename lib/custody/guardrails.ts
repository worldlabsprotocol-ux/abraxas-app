// FILE: lib/custody/guardrails.ts
// Fail-closed custody guardrails for partner-facing and chain surfaces.

import { detectDisclosureLeaks } from "@/lib/privacy/selectiveDisclosure/leakDetector";
import { SELECTIVE_DISCLOSURE_FORBIDDEN_CLASSES } from "@/lib/privacy/selectiveDisclosure/contract";
import type { StorageClass, CustodySurface, CustodyGuardrailResult, CustodyGuardrailViolation } from "./types";
import { isStorageClassAllowedOnSurface, rulesForStorageClass } from "./storageClassification";

const FORBIDDEN_STORAGE_CLASS_BY_SURFACE: Partial<Record<CustodySurface, StorageClass[]>> = {
  partner_webhook: ["raw_evidence", "encrypted_holder_evidence", "derived_fact", "credential", "commitment", "audit_metadata"],
  public_receipt: ["raw_evidence", "encrypted_holder_evidence", "derived_fact", "credential", "commitment", "audit_metadata"],
  partner_api: ["raw_evidence", "encrypted_holder_evidence"],
  query_parameter: ["raw_evidence", "encrypted_holder_evidence", "derived_fact", "credential", "commitment", "audit_metadata", "receipt"],
  application_log: ["raw_evidence", "encrypted_holder_evidence"],
  chain_commitment: ["raw_evidence", "encrypted_holder_evidence", "derived_fact", "credential", "receipt", "audit_metadata", "public_result"],
  browser_storage: ["raw_evidence"],
  holder_export: ["raw_evidence"],
};

const RAW_EVIDENCE_FIELD_MARKERS = [
  "date_of_birth",
  "dob",
  "legal_name",
  "document_image",
  "selfie",
  "passport_image",
  "biometric",
  "government_id",
  "raw_media",
  "manuscript",
  "audio_buffer",
  "video_buffer",
  "claim_value",
  "provider_payload",
  "storage_path",
] as const;

const CHAIN_FORBIDDEN_VALUE_PATTERNS = [
  /data:image\//i,
  /BEGIN [A-Z ]+ PRIVATE KEY/i,
  /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/,
] as const;

function violation(
  code: string,
  path: string,
  surface: CustodySurface,
  storageClass?: StorageClass,
): CustodyGuardrailViolation {
  return { code, path, surface, storageClass };
}

export function assertStorageClassesAllowedOnSurface(
  storageClasses: StorageClass[],
  surface: CustodySurface,
): CustodyGuardrailResult {
  const forbidden = FORBIDDEN_STORAGE_CLASS_BY_SURFACE[surface] ?? [];
  const violations: CustodyGuardrailViolation[] = [];
  for (const storageClass of storageClasses) {
    if (forbidden.includes(storageClass)) {
      violations.push(violation("forbidden_storage_class", storageClass, surface, storageClass));
    }
  }
  return { ok: violations.length === 0, violations };
}

export function detectRawEvidenceMarkers(payload: unknown, path = "$"): string[] {
  const hits: string[] = [];
  walkRawMarkers(payload, path, hits);
  return hits;
}

function walkRawMarkers(node: unknown, path: string, hits: string[]): void {
  if (node == null) return;
  if (Array.isArray(node)) {
    node.forEach((item, index) => walkRawMarkers(item, `${path}[${index}]`, hits));
    return;
  }
  if (typeof node === "string") {
    if (node.length > 512 && /^[A-Za-z0-9+/=]+$/.test(node.slice(0, 64))) {
      hits.push(`${path}:suspected_base64_blob`);
    }
    return;
  }
  if (typeof node !== "object") return;
  Object.entries(node as Record<string, unknown>).forEach(([key, value]) => {
    const lower = key.toLowerCase();
    if ((RAW_EVIDENCE_FIELD_MARKERS as readonly string[]).some((marker) => lower.includes(marker))) {
      hits.push(`${path}.${key}:raw_evidence_marker`);
    }
    walkRawMarkers(value, `${path}.${key}`, hits);
  });
}

export function assertCustodySafePayload(
  payload: unknown,
  surface: CustodySurface,
): CustodyGuardrailResult {
  const violations: CustodyGuardrailViolation[] = [];

  const leakHits = detectDisclosureLeaks(payload);
  leakHits.forEach((hit) => {
    violations.push(violation("selective_disclosure_leak", hit, surface));
  });

  const rawHits = detectRawEvidenceMarkers(payload);
  rawHits.forEach((hit) => {
    violations.push(violation("raw_evidence_marker", hit, surface, "raw_evidence"));
  });

  if (surface === "chain_commitment") {
    const serialized = JSON.stringify(payload ?? {});
    CHAIN_FORBIDDEN_VALUE_PATTERNS.forEach((pattern) => {
      if (pattern.test(serialized)) {
        violations.push(violation("chain_forbidden_value_pattern", pattern.source, surface, "raw_evidence"));
      }
    });
  }

  if (surface === "query_parameter" && typeof payload === "object" && payload !== null) {
    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      if (typeof value === "string" && value.length > 128) {
        violations.push(violation("query_oversized_value", key, surface));
      }
    }
  }

  return { ok: violations.length === 0, violations };
}

export function assertPersistAllowed(
  storageClass: StorageClass,
  surface: CustodySurface = "database_persist",
): CustodyGuardrailResult {
  const rules = rulesForStorageClass(storageClass);
  if (rules.persistence === "prohibited") {
    return {
      ok: false,
      violations: [violation("persistence_prohibited", storageClass, surface, storageClass)],
    };
  }
  if (surface !== "database_persist") {
    return assertStorageClassesAllowedOnSurface([storageClass], surface);
  }
  return { ok: true, violations: [] };
}

export function custodyForbiddenClassesForSurface(surface: CustodySurface): readonly string[] {
  if (surface === "chain_commitment") {
    return SELECTIVE_DISCLOSURE_FORBIDDEN_CLASSES;
  }
  if (surface === "partner_webhook" || surface === "public_receipt" || surface === "partner_api") {
    return SELECTIVE_DISCLOSURE_FORBIDDEN_CLASSES;
  }
  return SELECTIVE_DISCLOSURE_FORBIDDEN_CLASSES;
}

export function isChainEligibleStorageClass(storageClass: StorageClass): boolean {
  return isStorageClassAllowedOnSurface(storageClass, "chainEligible");
}

export function throwIfCustodyViolation(result: CustodyGuardrailResult, context: string): void {
  if (result.ok) return;
  const summary = result.violations.map((v) => `${v.code}@${v.path}`).join("; ");
  throw Object.assign(new Error(`custody_guardrail_violation:${context}:${summary}`), {
    code: "custody_guardrail_violation",
    violations: result.violations,
  });
}
