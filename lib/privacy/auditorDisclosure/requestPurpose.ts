// FILE: lib/privacy/auditorDisclosure/requestPurpose.ts

import { AUDITOR_DISCLOSURE_PURPOSES, type AuditorDisclosurePurpose } from "./contract";

export function parseRequestedDisclosurePurpose(value: unknown): AuditorDisclosurePurpose | { ok: false; reason: string } {
  if (typeof value !== "string" || !value.trim()) {
    return { ok: false, reason: "disclosure_purpose_required" };
  }
  const trimmed = value.trim() as AuditorDisclosurePurpose;
  if (!(AUDITOR_DISCLOSURE_PURPOSES as readonly string[]).includes(trimmed)) {
    return { ok: false, reason: "disclosure_purpose_invalid" };
  }
  return trimmed;
}

export function authorizeRequestedDisclosurePurpose(input: {
  requestedPurpose: AuditorDisclosurePurpose;
  mandatePurpose: AuditorDisclosurePurpose;
  principalAllowedPurposes: readonly AuditorDisclosurePurpose[];
}): { ok: true } | { ok: false; reason: string } {
  if (!input.principalAllowedPurposes.includes(input.requestedPurpose)) {
    return { ok: false, reason: "disclosure_purpose_not_authorized_for_credential" };
  }
  if (input.mandatePurpose !== input.requestedPurpose) {
    return { ok: false, reason: "disclosure_purpose_not_authorized_by_mandate" };
  }
  return { ok: true };
}