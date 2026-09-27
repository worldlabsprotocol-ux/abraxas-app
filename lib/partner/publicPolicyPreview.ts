// FILE: lib/partner/publicPolicyPreview.ts
// Normalize public policy copy before rendering. Catalog fields may be one sentence or a list.

export function normalizePublicPolicyItems(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    const item = value.trim();
    return item ? [item] : [];
  }
  return [];
}
