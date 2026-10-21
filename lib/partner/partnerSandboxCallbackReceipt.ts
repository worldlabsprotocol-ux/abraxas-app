// FILE: lib/partner/partnerSandboxCallbackReceipt.ts
// Receipt-authoritative sandbox callback presentation — URL params are hints only.

import type { DecisionReceiptPublicView } from "@/lib/decisionReceipts/types";
import type { PartnerSandboxCallbackView } from "@/lib/partner/partnerSandboxCallback";

export type PartnerSandboxReceiptFetchStatus =
  | "idle"
  | "loading"
  | "not_found"
  | "unavailable"
  | "loaded";

export type PartnerSandboxCallbackTrustLevel =
  | "loading"
  | "verified"
  | "verified_sandbox"
  | "not_currently_acceptable"
  | "denied"
  | "invalid_signature"
  | "not_found"
  | "unavailable"
  | "incomplete_callback"
  | "untrusted_url";

export interface PartnerSandboxCallbackDisplay {
  headline: string;
  body: string;
  trust_level: PartnerSandboxCallbackTrustLevel;
  /** Signed receipt loaded with valid signature and approved decision. */
  receipt_confirmed: boolean;
  /** True only when partners may treat the result as currently enforceable (currently_valid). */
  currently_acceptable_for_access: boolean;
  /** Valid signature + approved decision, even when no longer currently acceptable. */
  historically_authentic_approval: boolean;
  receipt: DecisionReceiptPublicView | null;
  url_mismatches: string[];
  acceptability_note: string | null;
  access_gate_note: string | null;
}

function urlMismatchWarnings(
  urlView: PartnerSandboxCallbackView,
  receipt: DecisionReceiptPublicView,
): string[] {
  const warnings: string[] = [];
  const urlPartner = urlView.hints.partner_id?.trim();
  const urlPolicy = urlView.hints.policy_id?.trim();
  if (urlPartner && urlPartner !== receipt.partner_id) {
    warnings.push("partner_id in the callback URL does not match the signed receipt.");
  }
  if (urlPolicy && urlPolicy !== receipt.policy_id) {
    warnings.push("policy_id in the callback URL does not match the signed receipt.");
  }
  return warnings;
}

export function resolvePartnerSandboxCallbackDisplay(input: {
  urlView: PartnerSandboxCallbackView;
  fetchStatus: PartnerSandboxReceiptFetchStatus;
  receipt: DecisionReceiptPublicView | null;
}): PartnerSandboxCallbackDisplay {
  const { urlView, fetchStatus, receipt } = input;

  if (urlView.forbidden_detected) {
    return {
      headline: "Callback could not be trusted",
      body: "Unexpected sensitive fields appeared in the callback URL. Do not log query strings. Verify using your server and the public receipt API only.",
      trust_level: "untrusted_url",
      receipt_confirmed: false,
      currently_acceptable_for_access: false,
      historically_authentic_approval: false,
      receipt: null,
      url_mismatches: [],
      acceptability_note: null,
      access_gate_note: null,
    };
  }

  if (urlView.holder_outcome === "invalid_callback" || urlView.parse_errors.length > 0) {
    return {
      headline: "Callback incomplete",
      body: "Required callback fields were missing or invalid. Changing the URL does not create a verification result.",
      trust_level: "incomplete_callback",
      receipt_confirmed: false,
      currently_acceptable_for_access: false,
      historically_authentic_approval: false,
      receipt: null,
      url_mismatches: [],
      acceptability_note: null,
      access_gate_note: null,
    };
  }

  if (fetchStatus === "idle" || fetchStatus === "loading") {
    return {
      headline: "Checking verification result",
      body: "Loading the signed receipt from Abraxas. Callback URL parameters alone are not proof of verification.",
      trust_level: "loading",
      receipt_confirmed: false,
      currently_acceptable_for_access: false,
      historically_authentic_approval: false,
      receipt: null,
      url_mismatches: [],
      acceptability_note: null,
      access_gate_note: null,
    };
  }

  if (fetchStatus === "not_found") {
    return {
      headline: "Result could not be verified",
      body: "No signed receipt was found for this reference. A forged status=approved in the URL does not create a successful verification.",
      trust_level: "not_found",
      receipt_confirmed: false,
      currently_acceptable_for_access: false,
      historically_authentic_approval: false,
      receipt: null,
      url_mismatches: [],
      acceptability_note: null,
      access_gate_note: null,
    };
  }

  if (fetchStatus === "unavailable") {
    return {
      headline: "Receipt verification unavailable",
      body: "Abraxas could not load the public receipt right now. Try again shortly. Do not grant access from the callback URL alone.",
      trust_level: "unavailable",
      receipt_confirmed: false,
      currently_acceptable_for_access: false,
      historically_authentic_approval: false,
      receipt: null,
      url_mismatches: [],
      acceptability_note: null,
      access_gate_note: null,
    };
  }

  if (!receipt) {
    return {
      headline: "Result could not be verified",
      body: "Receipt data was incomplete.",
      trust_level: "not_found",
      receipt_confirmed: false,
      currently_acceptable_for_access: false,
      historically_authentic_approval: false,
      receipt: null,
      url_mismatches: [],
      acceptability_note: null,
      access_gate_note: null,
    };
  }

  const url_mismatches = urlMismatchWarnings(urlView, receipt);

  if (receipt.status === "expired" || receipt.status === "revoked") {
    return {
      headline: receipt.status === "revoked" ? "Result no longer valid" : "Result expired",
      body: "The signed receipt is not active. Do not grant access based on this callback or an old approval status in the URL.",
      trust_level: "not_currently_acceptable",
      receipt_confirmed: false,
      currently_acceptable_for_access: false,
      historically_authentic_approval: receipt.signature_valid === true && receipt.decision_result === "approved",
      receipt,
      url_mismatches,
      acceptability_note: null,
      access_gate_note: "Access must not be granted from this result until a fresh verification and currently valid receipt are issued.",
    };
  }

  if (receipt.signature_valid === false) {
    return {
      headline: "Invalid receipt signature",
      body: "The public receipt failed cryptographic verification. Treat this callback as failed and do not grant access from URL parameters.",
      trust_level: "invalid_signature",
      receipt_confirmed: false,
      currently_acceptable_for_access: false,
      historically_authentic_approval: false,
      receipt,
      url_mismatches,
      acceptability_note: null,
      access_gate_note: null,
    };
  }

  if (receipt.decision_result === "denied" || receipt.decision_result === "manual_review") {
    return {
      headline: receipt.decision_result === "manual_review"
        ? "Verification pending review"
        : "Verification not approved",
      body: "The signed receipt does not authorize an approved result for this request.",
      trust_level: "denied",
      receipt_confirmed: false,
      currently_acceptable_for_access: false,
      historically_authentic_approval: false,
      receipt,
      url_mismatches,
      acceptability_note: null,
      access_gate_note: null,
    };
  }

  const currentlyValid = receipt.currently_valid === true;
  const sandbox = receipt.production_usable === false || receipt.decision_context === "sandbox_only";
  const historicallyAuthentic = true;

  let acceptability_note: string | null = null;
  let access_gate_note: string | null = null;
  let trust_level: PartnerSandboxCallbackTrustLevel = "verified";
  let headline = "Wallet control verified";
  let body = "Your verification is complete. The requesting application should confirm this signed result on its server before continuing.";

  if (!currentlyValid) {
    trust_level = sandbox ? "verified_sandbox" : "not_currently_acceptable";
    headline = "Signed wallet-control approval on record";
    body = "This is an authentic signed approval from your earlier verification. It is not, by itself, permission to grant access right now.";
    access_gate_note = "Do not grant access based on this page alone. The relying party must re-fetch the receipt and confirm it is currently acceptable before allowing entry.";
    acceptability_note = sandbox
      ? "Sandbox receipt: cryptographic signature is valid. Validate with your sandbox API key on the server. This is not standalone registry-backed verification and not a production authorization grant."
      : "Cryptographic signature is valid, but Abraxas reports this result is not currently acceptable for enforcement. Re-fetch on the server before granting access.";
  }

  return {
    headline,
    body,
    trust_level,
    receipt_confirmed: true,
    currently_acceptable_for_access: currentlyValid,
    historically_authentic_approval: historicallyAuthentic,
    receipt,
    url_mismatches,
    acceptability_note,
    access_gate_note,
  };
}
