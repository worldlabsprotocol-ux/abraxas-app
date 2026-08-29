// FILE: lib/admin/designPartnerPromoteReadiness.ts
// Client-safe operator guidance for approved design-partner promotion.

import {
  isValidPartnerId,
  normalizePartnerId,
  PARTNER_ID_MAX_LENGTH,
} from "@/lib/partner/partnerIdFormat";

export const PROMOTE_READINESS_ATTESTATION_COPY =
  "Operator guidance — not a completed-readiness attestation.";

export const PROMOTE_SANDBOX_KEY_COPY =
  "Promotion issues an abx_test_… sandbox API key only.";

export const PROMOTE_PRODUCTION_SEPARATION_COPY =
  "Production activation and abx_live_… key issuance are separate later operator actions.";

export const PROMOTE_HANDOFF_SESSION_COPY =
  "Session-only policy_id and return_url fields below are not persisted or auto-provisioned.";

export const APPROVED_PROMOTE_GUIDANCE =
  "Choose a partner_id slug, then promote to issue a one-time sandbox abx_test_ key. Production activation remains a separate manual workflow.";

export const PARTNER_ID_FORMAT_HINT =
  `Use lowercase letters, numbers, hyphens, or underscores. Must start with a letter or number (max ${PARTNER_ID_MAX_LENGTH} characters).`;

export const PARTNER_ID_FORMAT_VALID_COPY =
  "Format looks valid. Availability is confirmed only by the server when you promote.";

export const PARTNER_ID_FORMAT_INVALID_COPY =
  "Enter a valid partner_id format before promoting.";

export const PROMOTE_READINESS_PREREQUISITES = [
  "Application status is approved.",
  "partner_id slug is chosen for the sandbox relying-party row.",
  PROMOTE_SANDBOX_KEY_COPY,
  PROMOTE_PRODUCTION_SEPARATION_COPY,
] as const;

export const PROMOTE_READINESS_DOC_PATH = "docs/EXTERNAL_DESIGN_PARTNER_PILOT.md";

export const PROMOTE_READINESS_LINKS = {
  sandboxDocs: "/docs/partner-flow#external-design-partner-sandbox",
  partnersAdmin: "/admin/partners",
  productionActivation: "/admin/partner-flow/readiness",
} as const;

export type ClipboardCopyResult = "success" | "unavailable" | "failed";

export interface PartnerIdPromoteEvaluation {
  normalized: string;
  formatValid: boolean;
  message: string | null;
}

export function evaluatePartnerIdForPromote(value: string): PartnerIdPromoteEvaluation {
  const normalized = normalizePartnerId(value);
  if (!normalized) {
    return {
      normalized,
      formatValid: false,
      message: PARTNER_ID_FORMAT_INVALID_COPY,
    };
  }
  if (!isValidPartnerId(normalized)) {
    return {
      normalized,
      formatValid: false,
      message: PARTNER_ID_FORMAT_INVALID_COPY,
    };
  }
  return {
    normalized,
    formatValid: true,
    message: PARTNER_ID_FORMAT_VALID_COPY,
  };
}

export async function copyTextToClipboard(text: string): Promise<ClipboardCopyResult> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return "unavailable";
  }
  try {
    await navigator.clipboard.writeText(text);
    return "success";
  } catch {
    return "failed";
  }
}

export const CLIPBOARD_SUCCESS_COPY = "Copied";
export const CLIPBOARD_UNAVAILABLE_COPY = "Select the text above to copy manually.";
export const CLIPBOARD_FAILED_COPY = "Copy failed. Select the text above to copy manually.";

export const COPY_SANDBOX_KEY_LABEL = "Copy sandbox API key";
export const COPY_PARTNER_ID_LABEL = "Copy partner_id";
