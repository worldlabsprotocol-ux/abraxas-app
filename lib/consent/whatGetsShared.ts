// FILE: lib/consent/whatGetsShared.ts
// Plain-language consent copy — what a partner needs vs what never leaves the user.

const CLAIM_PLAIN: Record<string, string> = {
  wallet_binding_confirmed: "you control this wallet",
  wallet_control_verified: "you control this wallet",
  identity_verified: "your identity check passed",
  accredited_status: "you meet investor eligibility rules",
  sanctions_clear: "you cleared sanctions screening",
  guest_eligibility: "your guest approval is active",
  profile_complete: "your account profile is ready",
};

const DEFAULT_NEEDS = "whether you meet the policy for this action";

export function plainClaimLabels(claimTypes: string[], fallbackLabels?: string[]): string[] {
  if (fallbackLabels?.length) return fallbackLabels;
  return claimTypes.map(ct => CLAIM_PLAIN[ct] ?? ct.replace(/_/g, " "));
}

export function buildWhatGetsSharedCopy(input: {
  partnerName: string;
  policyName?: string;
  sharedLabels: string[];
  requestedAction?: string | null;
}): {
  headline: string;
  needsLine: string;
  notSharedLine: string;
} {
  const partner = input.partnerName.trim() || "This partner";
  const needs =
    input.sharedLabels.length > 0
      ? input.sharedLabels.join(" and ")
      : DEFAULT_NEEDS;

  const actionHint = input.requestedAction
    ? ` for ${input.requestedAction.replace(/_/g, " ")}`
    : "";

  return {
    headline: "What gets shared",
    needsLine: `${partner} needs to know: ${needs}${actionHint}.`,
    notSharedLine:
      "It will not receive your ID photos, biometrics, home address, or full document files.",
  };
}
