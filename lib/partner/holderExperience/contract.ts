// FILE: lib/partner/holderExperience/contract.ts
// Holder verification copy and recovery. Existing Partner Flow only.

import { GOOGLE_ACCOUNT_NOT_ELIGIBILITY } from "@/lib/partner/launchpad/policyPacks";

export const HOLDER_EXPERIENCE_VERSION = "1.0.0" as const;

export const HOLDER_RECOVERY_STATES = [
  "loading",
  "expired",
  "missing",
  "cancelled",
  "denied",
  "invalid_binding",
  "session_required",
  "method_not_qualified",
  "provider_unavailable",
  "approved",
  "sandbox_approved",
] as const;
export type HolderRecoveryState = (typeof HOLDER_RECOVERY_STATES)[number];

export const HOLDER_NEXT_ACTIONS = [
  "sign_in_again",
  "restart_partner_link",
  "choose_qualifying_method",
  "return_to_passport",
  "contact_requesting_partner",
] as const;
export type HolderNextAction = (typeof HOLDER_NEXT_ACTIONS)[number];

export const HOLDER_GOOGLE_ACCOUNT_ONLY = GOOGLE_ACCOUNT_NOT_ELIGIBILITY;

export const HOLDER_PASSPORT_HREF = "/passport" as const;

export const HOLDER_CLIENT_LEAK_PATTERN =
  /abx_(test|live|whsec)_|eyJ[A-Za-z0-9_-]{8,}|receipt_id|0x[a-f0-9]{20,}|wallet_address|date_of_birth|legal_name|SQLSTATE|relation .* does not exist|oauth|jwt|private_key/i;
