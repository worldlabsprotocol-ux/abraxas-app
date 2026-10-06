// FILE: lib/partner/twoAppEvaluation/classification.ts
// Fail-closed evidence classification — external status requires positive evidence.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import type { TwoAppEvidenceClassification } from "./contract";

const REFERENCE_PARTNER_PREFIXES = [
  "reference-",
  "ref-",
  "institutional-platform",
] as const;

const INTERNAL_PARTNER_PREFIXES = [
  "abraxas-",
  "internal-",
  "harness-",
  "demo-",
] as const;

export const TWO_APP_CLASSIFICATION_SOURCES = [
  "unclassified",
  "inferred_reference",
  "inferred_internal",
  "design_partner_promotion",
  "operator_review",
] as const;

export type TwoAppClassificationSource = (typeof TWO_APP_CLASSIFICATION_SOURCES)[number];

export interface ResolvedEvidenceClassification {
  classification: TwoAppEvidenceClassification;
  source: TwoAppClassificationSource;
  classified_at: string;
}

const promotedDesignPartnerMemory = new Set<string>();

export function resetPromotedDesignPartnerMemoryForTests(): void {
  promotedDesignPartnerMemory.clear();
}

export function seedPromotedDesignPartnerForTests(partnerId: string): void {
  promotedDesignPartnerMemory.add(partnerId.trim());
}

async function isPromotedDesignPartner(partnerId: string): Promise<boolean> {
  const normalized = partnerId.trim();
  if (!normalized) return false;
  if (process.env.VITEST) return promotedDesignPartnerMemory.has(normalized);
  try {
    const sb = requireSupabaseAdmin();
    const { data } = await sb
      .from("design_partners")
      .select("id")
      .eq("promoted_partner_id", normalized)
      .limit(1)
      .maybeSingle();
    return Boolean(data);
  } catch {
    return false;
  }
}

function inferReferenceOrInternal(partnerId: string): ResolvedEvidenceClassification | null {
  const id = partnerId.trim().toLowerCase();
  const now = new Date().toISOString();
  if (REFERENCE_PARTNER_PREFIXES.some((p) => id.startsWith(p))) {
    return { classification: "REFERENCE_TEST", source: "inferred_reference", classified_at: now };
  }
  if (INTERNAL_PARTNER_PREFIXES.some((p) => id.startsWith(p))) {
    return { classification: "INTERNAL_SANDBOX", source: "inferred_internal", classified_at: now };
  }
  if (id.startsWith("studio-") && id.length < 24) {
    return { classification: "INTERNAL_SANDBOX", source: "inferred_internal", classified_at: now };
  }
  return null;
}

export async function resolveEvidenceClassification(input: {
  partnerId: string;
  operatorOverride?: TwoAppEvidenceClassification | null;
  harnessMetadata?: boolean;
  operatorSource?: TwoAppClassificationSource;
  classifiedAt?: string | null;
}): Promise<ResolvedEvidenceClassification> {
  const now = input.classifiedAt ?? new Date().toISOString();

  if (input.harnessMetadata) {
    return { classification: "REFERENCE_TEST", source: "inferred_reference", classified_at: now };
  }

  if (input.operatorOverride) {
    return {
      classification: input.operatorOverride,
      source: input.operatorSource ?? "operator_review",
      classified_at: now,
    };
  }

  const inferred = inferReferenceOrInternal(input.partnerId);
  if (inferred) return inferred;

  if (await isPromotedDesignPartner(input.partnerId)) {
    return {
      classification: "EXTERNAL_SANDBOX",
      source: "design_partner_promotion",
      classified_at: now,
    };
  }

  return { classification: "UNCLASSIFIED_SANDBOX", source: "unclassified", classified_at: now };
}

/** Sync inference for tests and prefix-only checks — never defaults to external. */
export function inferEvidenceClassification(input: {
  partnerId: string;
  operatorOverride?: TwoAppEvidenceClassification | null;
  harnessMetadata?: boolean;
}): TwoAppEvidenceClassification {
  if (input.operatorOverride) return input.operatorOverride;
  if (input.harnessMetadata) return "REFERENCE_TEST";

  const inferred = inferReferenceOrInternal(input.partnerId);
  if (inferred) return inferred.classification;

  return "UNCLASSIFIED_SANDBOX";
}

export function getEffectiveClassification(record: {
  evidence_classification: TwoAppEvidenceClassification;
  operator_classification_override: TwoAppEvidenceClassification | null;
}): TwoAppEvidenceClassification {
  return record.operator_classification_override ?? record.evidence_classification;
}

export function isExternalClassification(
  classification: TwoAppEvidenceClassification,
): boolean {
  return classification === "EXTERNAL_SANDBOX" || classification === "PRODUCTION";
}

export function isPositiveExternalClassification(
  classification: TwoAppEvidenceClassification,
): boolean {
  return isExternalClassification(classification);
}
