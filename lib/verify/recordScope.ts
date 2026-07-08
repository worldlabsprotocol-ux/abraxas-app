// FILE: lib/verify/recordScope.ts
// Human-readable verification scope labels for public record pages.

import type { VerifierResponse } from "@/lib/verifyRegistry";
import { assuranceRowIssuer } from "@/lib/assuranceTaxonomy";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";

export function recordTypeLabel(resolvedType: VerifierResponse["resolved_type"]): string {
  switch (resolvedType) {
    case "asset":
    case "registry_entry":
      return "Asset Passport";
    case "passport":
      return "Identity Passport";
    case "credential_jwt":
      return "Verifiable Credential";
    default:
      return "Registry Record";
  }
}

export function verificationScopeText(result: VerifierResponse): string {
  if (result.resolved_type === "asset" || result.resolved_type === "registry_entry") {
    if (result.asset_class === "REAL_ESTATE_HOSPITALITY") {
      return "Ownership evidence, deed review, independent appraisal linkage, booking/listing cross-check";
    }
    if (result.asset_class?.includes("REAL_ESTATE")) {
      return "Title evidence, ownership chain, appraisal or valuation attestation where available";
    }
    return "Registry identity, assurance taxonomy, pipeline stage, and monitoring status";
  }
  if (result.resolved_type === "passport" || result.resolved_type === "credential_jwt") {
    return "Credential signature, revocation status, claim scope, and expiry";
  }
  return "Public registry lookup — assurance levels and named issuers where on file";
}

export function primaryIssuer(result: VerifierResponse): string {
  const tax = result.assurance_taxonomy ?? {};
  const l3 = tax.L3_ProfessionalAttestation;
  if (l3) return assuranceRowIssuer(l3);
  const l2 = tax.L2_LegalReview;
  if (l2) return assuranceRowIssuer(l2);
  const l1 = tax.L1_IdentityClaim;
  if (l1) return assuranceRowIssuer(l1);
  const l4 = tax.L4_ActiveMonitoring;
  if (l4) return assuranceRowIssuer(l4);
  return "Pending named issuer";
}

/** SSR detail rows shown above the interactive verifier */
export function recordDetailRows(result: VerifierResponse): Array<[string, string]> {
  const statusLabel = result.state === "RESOLVED_VALID"
    ? "VALID — ACTIVE"
    : result.state === "RESOLVED_REVOKED"
      ? "EXPIRED OR REVOKED"
      : "NOT FOUND";

  return [
    ["Status", statusLabel],
    ["Record type", recordTypeLabel(result.resolved_type)],
    ["Assurance", result.assurance_level ? `L${result.assurance_level}` : "—"],
    ["Last reviewed", result.last_sync_timestamp
      ? new Date(result.last_sync_timestamp).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
      : "—"],
    ["Verification scope", verificationScopeText(result)],
    ["Primary issuer", primaryIssuer(result)],
  ];
}

export const RECORD_DETAIL_FONT = FONT;
export const RECORD_DETAIL_MONO = MONO;
