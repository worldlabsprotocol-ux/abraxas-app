// FILE: lib/partner/partnerHolderCopy.ts
// Customer-facing holder states for partner age verification — nontechnical copy.

export type PartnerHolderState =
  | "confirm_account"
  | "checking_existing_proof"
  | "existing_proof_accepted"
  | "choose_private_method"
  | "provider_unavailable"
  | "verification_in_progress"
  | "verification_could_not_confirm"
  | "verify_age"
  | "id_upload_fallback"
  | "under_review"
  | "age_confirmed"
  | "return_to_partner"
  | "verification_expired";

export interface PartnerHolderPresentation {
  state: PartnerHolderState;
  title: string;
  message: string;
  action_label: string | null;
  /** Privacy copy shown on method-selection screens. */
  privacy_note?: string;
}

const PRIVACY_NOTES = {
  auth_not_age: "Signing in confirms your account. It does not verify your age.",
  partner_minimal: "Good Trouble receives only the eligibility result, not your birth date or evidence.",
  id_fallback: "Upload an ID only if another private verification method is unavailable.",
  merchant_obligation: "The merchant may still require identification at purchase or delivery.",
} as const;

const COPY: Record<PartnerHolderState, Omit<PartnerHolderPresentation, "state">> = {
  confirm_account: {
    title: "Confirm your account",
    message: "Sign in with Google to connect your Abraxas account. Signing in confirms account control — it does not verify your age.",
    action_label: "Continue with Google",
    privacy_note: PRIVACY_NOTES.auth_not_age,
  },
  checking_existing_proof: {
    title: "Checking for existing proof",
    message: "Looking for an active Abraxas age credential that satisfies this partner's policy…",
    action_label: null,
  },
  existing_proof_accepted: {
    title: "Use your existing Abraxas age proof",
    message: "You already have active age verification. Reuse it to share only the eligibility result with this partner — no new evidence required.",
    action_label: "Use my existing Abraxas age proof",
    privacy_note: PRIVACY_NOTES.partner_minimal,
  },
  choose_private_method: {
    title: "Verify privately without uploading ID",
    message: "Choose a privacy-preserving verification method. Partners receive only the eligibility result.",
    action_label: null,
    privacy_note: PRIVACY_NOTES.partner_minimal,
  },
  provider_unavailable: {
    title: "Private verification unavailable",
    message: "No privacy-preserving age-assurance providers are configured in this environment. You can verify another way or return to the partner.",
    action_label: null,
  },
  verification_in_progress: {
    title: "Verification in progress",
    message: "Complete verification with your chosen provider. Do not close this window until you return here.",
    action_label: null,
  },
  verification_could_not_confirm: {
    title: "Verification could not be confirmed",
    message: "We could not confirm your age with the selected method. Try another private method or use document verification as a fallback.",
    action_label: "Try again",
  },
  verify_age: {
    title: "Choose how to verify your age",
    message: "This partner requires age verification. Select the option that works best for you.",
    action_label: null,
    privacy_note: PRIVACY_NOTES.auth_not_age,
  },
  id_upload_fallback: {
    title: "Verify another way",
    message: "Upload your government ID and a selfie for review. This is a fallback when private methods are unavailable. We will explain retention and deletion before collection.",
    action_label: "Continue with ID verification",
    privacy_note: PRIVACY_NOTES.id_fallback,
  },
  under_review: {
    title: "Under manual review",
    message: "Your submission is being reviewed. You can close this window and return to the partner later.",
    action_label: null,
  },
  age_confirmed: {
    title: "Age confirmed",
    message: "Your verification is complete. Returning you to the partner now…",
    action_label: null,
  },
  return_to_partner: {
    title: "Return to Good Trouble",
    message: "If you are not redirected automatically, use the button below to return.",
    action_label: "Return to partner",
  },
  verification_expired: {
    title: "Verification expired—update required",
    message: "Your previous verification has expired. Complete verification again to continue.",
    action_label: "Update verification",
  },
};

export function resolvePartnerHolderPresentation(
  state: PartnerHolderState,
  partnerName?: string,
): PartnerHolderPresentation {
  const base = COPY[state];
  const partner = partnerName ?? "the partner";
  const partnerMinimal = base.privacy_note?.replace(/Good Trouble/g, partner) ?? base.privacy_note;
  return {
    state,
    ...base,
    message: base.message.replace(/the partner/gi, partner).replace(/Good Trouble/g, partner),
    title: state === "return_to_partner" && partnerName
      ? `Return to ${partnerName}`
      : base.title.replace(/Good Trouble/g, partner),
    privacy_note: partnerMinimal,
  };
}

export function partnerHolderPrivacyNotes(partnerName?: string) {
  const partner = partnerName ?? "the partner";
  return {
    auth_not_age: PRIVACY_NOTES.auth_not_age,
    partner_minimal: PRIVACY_NOTES.partner_minimal.replace(/Good Trouble/g, partner),
    id_fallback: PRIVACY_NOTES.id_fallback,
    merchant_obligation: PRIVACY_NOTES.merchant_obligation,
  };
}
