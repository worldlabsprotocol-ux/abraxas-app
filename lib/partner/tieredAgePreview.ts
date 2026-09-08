// FILE: lib/partner/tieredAgePreview.ts
// Canonical constants for the tiered browse self-attestation preview route.

export const TIERED_AGE_PREVIEW_PURPOSE = "browse" as const;

export const TIERED_AGE_PREVIEW_PATH = "/partner/tiered-age-preview" as const;

export function buildTieredAgePreviewUrl(origin = ""): string {
  const params = new URLSearchParams({
    purpose: TIERED_AGE_PREVIEW_PURPOSE,
    partner_id: "good-trouble-cannabis",
    policy_id: "good-trouble-browse-v1",
  });
  return `${origin}${TIERED_AGE_PREVIEW_PATH}?${params.toString()}`;
}
