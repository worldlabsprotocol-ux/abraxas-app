// FILE: lib/privacy/privacyDataInventory.ts
// Documented Abraxas data categories for the Privacy Center (plain language).

export interface PrivacyDataCategory {
  id: string;
  title: string;
  summary: string;
  partnerExposure: string;
  retentionNote: string;
}

export const PRIVACY_DATA_CATEGORIES: PrivacyDataCategory[] = [
  {
    id: "identity_verification",
    title: "Identity verification records",
    summary:
      "Verification status, document type metadata, and review outcomes tied to your Passport.",
    partnerExposure: "Partners receive signed proof claims — not your ID images or legal name by default.",
    retentionNote: "Retained for fraud prevention and audit; not auto-deleted by holder requests.",
  },
  {
    id: "documents_biometrics",
    title: "ID document and selfie captures",
    summary:
      "Images you upload during verification, stored in private object storage with restricted access.",
    partnerExposure: "Never shared with partners as raw files.",
    retentionNote: "Biometric retention windows are configured but automated purge is not yet implemented.",
  },
  {
    id: "credentials_claims",
    title: "Credentials and claims",
    summary:
      "Issued credential artifacts and normalized claims (e.g. identity verified, jurisdiction).",
    partnerExposure: "Partners verify specific claims required by their policy — not full credentials.",
    retentionNote: "Revocation can disable future partner use; historical receipts may remain for audit.",
  },
  {
    id: "partner_consent",
    title: "Partner consent and decision history",
    summary:
      "Records of which partners you approved, which claims were authorized, and eligibility decisions.",
    partnerExposure: "Each partner sees only what you approved for their policy.",
    retentionNote: "Immutable audit trail; not deleted on account requests.",
  },
  {
    id: "wallet_bindings",
    title: "Wallet bindings",
    summary: "Links between your Passport identity and connected wallet addresses.",
    partnerExposure: "Partners may see a binding reference in receipts — not your full account profile.",
    retentionNote: "Can be revoked; binding history may remain in audit logs.",
  },
  {
    id: "audit_metering",
    title: "Security, audit, and metering events",
    summary:
      "Append-only operational logs for verification, partner flow, and platform security.",
    partnerExposure: "Not shared with partners.",
    retentionNote: "Retained for security and legal evidence; not eligible for holder-initiated erasure.",
  },
];

export const PRIVACY_CENTER_DISCLAIMER =
  "This privacy center is technical infrastructure for requesting export or account changes. "
  + "It is not a legal compliance portal and does not automatically delete your data.";

export const EXPORT_DELIVERY_NOTE =
  "Export requests are reviewed and fulfilled by Abraxas operators. "
  + "We do not place exports on public URLs. Raw ID or selfie files are not included by default.";

export const DELETION_SAFETY_NOTE =
  "Deletion requests never immediately erase data. If approved, we revoke Passport access and credentials first. "
  + "Physical deletion of stored documents requires a separate retention policy and storage purge — not automatic in this release.";

export const LEGAL_HOLD_NOTE =
  "Some records cannot be deleted yet because of legal hold, active investigation, or immutable audit requirements. "
  + "We will explain the status in plain language when this applies.";
