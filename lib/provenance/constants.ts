// FILE: lib/provenance/constants.ts
// Canonical content provenance partner-flow identifiers.

/** Policy pack catalog id for the unified origin-disclosure policy. */
export const CONTENT_ORIGIN_DISCLOSURE_PACK_ID = "content_origin_disclosure" as const;

/** Canonical policy id suffix — partners pin `{partnerId}-content-origin-disclosure-v1`. */
export const CONTENT_ORIGIN_DISCLOSURE_POLICY_MARK = "content-origin-disclosure-v1" as const;

/** Sandbox reference partner for integration tests and Launchpad demos. */
export const SANDBOX_CONTENT_PUBLISHER_PARTNER_ID = "sandbox-content-publisher" as const;

export function isContentOriginDisclosurePolicyId(policyId: string): boolean {
  const id = policyId.trim();
  return id.includes(CONTENT_ORIGIN_DISCLOSURE_POLICY_MARK)
    || id.includes(CONTENT_ORIGIN_DISCLOSURE_PACK_ID);
}

export function isContentOriginDisclosurePackId(packId: string): boolean {
  return packId.trim() === CONTENT_ORIGIN_DISCLOSURE_PACK_ID;
}

/** L0 sandbox provenance sessions may issue receipts without a full Passport credential. */
export function resolveProvenanceSandboxCredentialJti(subjectId: string): string {
  return `sandbox-provenance:${subjectId.trim().toLowerCase()}`;
}
