// FILE: lib/partner/partnerHolderCopy.ts
// Customer-facing holder states for partner age verification — nontechnical copy.

export type PartnerHolderState =
  | "confirm_account"
  | "verify_age"
  | "under_review"
  | "age_confirmed"
  | "return_to_partner"
  | "verification_expired";

export interface PartnerHolderPresentation {
  state: PartnerHolderState;
  title: string;
  message: string;
  action_label: string | null;
}

const COPY: Record<PartnerHolderState, Omit<PartnerHolderPresentation, "state">> = {
  confirm_account: {
    title: "Confirm your account",
    message: "Sign in with Google to connect your Abraxas account. Signing in confirms account control — it does not verify your age.",
    action_label: "Continue with Google",
  },
  verify_age: {
    title: "Verify your age",
    message: "This partner requires age verification. You will submit your government ID and a selfie for review.",
    action_label: "Continue verification",
  },
  under_review: {
    title: "Verification under review",
    message: "Your submission is being reviewed. You can close this window and return to the partner later.",
    action_label: null,
  },
  age_confirmed: {
    title: "Age requirement confirmed",
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
  return {
    state,
    ...base,
    message: base.message.replace(/the partner/gi, partner),
    title: state === "return_to_partner" && partnerName
      ? `Return to ${partnerName}`
      : base.title,
  };
}
