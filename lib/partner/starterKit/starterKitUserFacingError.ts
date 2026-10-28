// FILE: lib/partner/starterKit/starterKitUserFacingError.ts

const MESSAGES: Record<string, string> = {
  unknown_field:
    "The integration request included an unexpected field. Refresh the page and try again. If this continues, contact support with code unknown_field.",
  unknown_pack: "That verification policy is not available for integration files.",
  unknown_path: "Choose a supported integration path and try again.",
  unknown_platform: "Choose a supported platform and try again.",
  unknown_runtime: "Choose a supported platform and try again.",
  mixed_selection: "Those integration options cannot be combined. Choose one platform and path.",
  invalid_input: "Could not read the integration request. Refresh and try again.",
  invalid_capabilities: "One or more optional capabilities are invalid.",
  unknown_capability: "One or more optional capabilities are not supported.",
  capability_rejected: "That capability is not available in sandbox integration files.",
  browser_only_forbidden:
    "Browser-only sites cannot verify receipts. Use an HTTPS backend or serverless function.",
  activity_category_unavailable:
    "Partner activity signals are not available for the selected policy.",
  unknown_venue_profile: "Choose a supported trading venue profile.",
};

export function starterKitUserFacingError(code: string | undefined): string {
  if (!code) return "Could not generate integration files. Try again or change your platform selection.";
  return MESSAGES[code] ?? `Could not generate integration files (${code}). Try again or contact support.`;
}
