// Holder-visible partner flow errors with safe support references (Build #512).

export function formatPartnerFlowSupportRef(input: {
  correlationId?: string | null;
  flowTraceId?: string | null;
}): string | null {
  const cid = input.correlationId?.trim();
  if (cid && /^pv_[a-f0-9]{6,16}$/i.test(cid)) return cid;
  const trace = input.flowTraceId?.trim();
  if (trace && trace.length >= 8 && trace.length <= 64) return trace;
  return null;
}

export function partnerFlowErrorPresentation(input: {
  code?: string;
  correlationId?: string | null;
  flowTraceId?: string | null;
}): { message: string; nextStep: string; supportRef: string | null } {
  const supportRef = formatPartnerFlowSupportRef(input);
  const refSuffix = supportRef ? ` Reference: ${supportRef}.` : "";

  switch (input.code) {
    case "open_redirect":
    case "launchpad_return_url_rejected":
    case "tuple_conflict":
      return {
        message: "This verification link does not match the partner request.",
        nextStep: "Start again from the partner’s verification link. Your wallet session is still safe.",
        supportRef,
      };
    case "policy_substitution_denied":
      return {
        message: "This policy is not available for your signed-in session.",
        nextStep: "Sign out, reconnect the wallet you used before, or restart from the partner link.",
        supportRef,
      };
    case "return_url_rejected":
      return {
        message: "The return destination for this request could not be verified.",
        nextStep: "Open a fresh verification link from the partner — do not edit the URL.",
        supportRef,
      };
    default:
      return {
        message: `Verification could not be completed.${refSuffix}`,
        nextStep: "Try again below. If the problem continues, restart from the partner link or open Passport to check your verification status.",
        supportRef,
      };
  }
}
