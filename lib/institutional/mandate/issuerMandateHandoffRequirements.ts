// FILE: lib/institutional/mandate/issuerMandateHandoffRequirements.ts
// Build 895 — minimum external issuer onboarding contract (documentation-only; no new dashboard).

import {
  INSTITUTIONAL_MANDATE_DOCUMENT,
  INSTITUTIONAL_MANDATE_ISSUER_REASON_CLASS,
  INSTITUTIONAL_MANDATE_SCHEMA_VERSION,
  type InstitutionalMandatePayload,
} from "@/lib/institutional/mandate/contract";

/** Evidence an authorized institution must supply out-of-band before mandate signing is accepted. */
export type IssuerMandateHandoffRequirement = {
  id: string;
  summary: string;
  validation: string;
};

export const ISSUER_MANDATE_HANDOFF_REQUIREMENTS: IssuerMandateHandoffRequirement[] = [
  {
    id: "signed_issuer_authority",
    summary: "Signed issuer authority statement binding issuer_id to mandate-capable keys.",
    validation: "verifySignedIssuerAuthority against pinned trust anchor; reason_class must include mandate issuer.",
  },
  {
    id: "trust_anchor_pin",
    summary: "Relying party or Abraxas tenant pins trust anchor bundle (registry + verification keys).",
    validation: "Out-of-band pin must match bundled anchor on every verification (no URL-only trust).",
  },
  {
    id: "mandate_payload",
    summary: "Signed institutional mandate matching schema " + INSTITUTIONAL_MANDATE_SCHEMA_VERSION + ".",
    validation:
      "verifySignedInstitutionalMandate: payload_hash, signature, tenant_id, policy binding, not_before/not_after, revoked_at.",
  },
  {
    id: "mandate_issuer_key_class",
    summary: "Signing key authorized for " + INSTITUTIONAL_MANDATE_ISSUER_REASON_CLASS + ".",
    validation: "Receipt-only keys must not sign mandates (Build 889 adversarial).",
  },
  {
    id: "execution_context",
    summary: "Sealed transaction context digest for protected enforcement.",
    validation: "enforceProtectedInstitutionalAction rejects digest mismatch (Build 889).",
  },
];

export function mandateHandoffDocumentChecklist(): string[] {
  return [
    INSTITUTIONAL_MANDATE_DOCUMENT,
    ...ISSUER_MANDATE_HANDOFF_REQUIREMENTS.map((r) => r.id),
  ];
}

export type MandateHandoffPreview = Pick<
  InstitutionalMandatePayload,
  "issuer_id" | "tenant_id" | "policy_id" | "environment" | "mandate_id"
>;
