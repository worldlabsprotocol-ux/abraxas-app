// FILE: lib/passport/identityUiState.ts
// Single identity status for Passport UI — no contradictory copy.

export type IdentityUiState = "not_started" | "under_review" | "verified" | "needs_action";

export function resolveIdentityUiState(input: {
  identityStatus: "not_started" | "pending" | "earned" | "declined";
  hasCredential: boolean;
  idvProvider: "veriff" | "manual";
  via: string | null;
}): IdentityUiState {
  if (input.hasCredential && input.identityStatus === "earned") return "verified";
  if (input.identityStatus === "declined") return "needs_action";
  if (input.identityStatus === "pending") {
    if (input.via === "manual_review") return "under_review";
    if (input.idvProvider === "veriff") return "under_review";
    return "not_started";
  }
  return "not_started";
}

export const IDENTITY_UI_LABELS: Record<IdentityUiState, string> = {
  not_started: "Not added",
  under_review: "Under review",
  verified: "Verified",
  needs_action: "Needs action",
};
