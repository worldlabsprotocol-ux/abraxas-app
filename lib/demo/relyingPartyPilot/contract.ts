// FILE: lib/demo/relyingPartyPilot/contract.ts
// Canonical age_21_retail relying-party pilot — reusable for any merchant, not Good Trouble-specific.

import type { PolicyPackId } from "@/lib/partner/launchpad/policyPacks";

export const RELYING_PARTY_PILOT_PACK_ID: PolicyPackId = "age_21_retail";

export const RELYING_PARTY_PILOT_PURPOSE = "Confirm customer is 21 or older" as const;

export const RELYING_PARTY_PILOT_REQUESTED_DISCLOSURE = "Age eligibility only (21+ result)" as const;

export const RELYING_PARTY_PILOT_EXPECTED_RESULT = "eligible / not eligible" as const;

export const RELYING_PARTY_PILOT_DEMO_PATH = "/demo/relying-party" as const;

export const RELYING_PARTY_PILOT_CALLBACK_PATH = "/demo/relying-party/callback" as const;

export const RELYING_PARTY_PILOT_VERIFY_API = "/api/demo/relying-party/verify" as const;

export const RELYING_PARTY_PILOT_CONFIG_API = "/api/demo/relying-party/config" as const;

export type RelyingPartyPilotSlot = "a" | "b";

export const RELYING_PARTY_PILOT_STEPS = [
  { id: "request", label: "Request", detail: "Relying partner initiates an age_21_retail verification request." },
  { id: "authorization", label: "Holder authorization", detail: "Holder reviews who is asking, why, and what will be shared." },
  { id: "verification", label: "Abraxas verification", detail: "Holder satisfies the policy or reuses current Abraxas evidence." },
  { id: "evaluation", label: "Policy evaluation", detail: "Abraxas evaluates the pinned policy against holder evidence." },
  { id: "receipt", label: "Signed receipt", detail: "Abraxas issues a partner-bound signed decision receipt." },
  { id: "partner_verify", label: "Partner verification", detail: "Partner server re-fetches and verifies the public receipt." },
  { id: "decision", label: "Access decision", detail: "Partner grants or denies access from verified receipt state only." },
] as const;

export type RelyingPartyPilotStepId = (typeof RELYING_PARTY_PILOT_STEPS)[number]["id"];

export const RELYING_PARTY_PILOT_FORBIDDEN_PARTNER_FIELDS = [
  "date_of_birth",
  "dateOfBirth",
  "dob",
  "legal_name",
  "legalName",
  "government_id",
  "passport_number",
  "wallet_address",
  "wallet",
  "email",
  "street_address",
  "biometric",
  "selfie",
  "document_image",
  "provider_payload",
] as const;

export const RELYING_PARTY_PILOT_TRADITIONAL_RESPONSE = {
  label: "Traditional repeated verification",
  receives: [
    "Government ID images or scans",
    "Date of birth",
    "Legal name and address",
    "Repeated document upload per application",
  ],
} as const;

export const RELYING_PARTY_PILOT_ABRAXAS_RESPONSE = {
  label: "Abraxas",
  receives: [
    "age_eligible_21 (boolean-equivalent policy result)",
    "Signed receipt bound to this partner and policy",
    "Expiry and current-validity metadata",
  ],
} as const;

export const RELYING_PARTY_PILOT_NOTICE =
  "Pilot demonstration of Hosted Partner Flow with age_21_retail. Configure sandbox partners via Integration Studio or environment variables. Callback query parameters are never authorization.";
