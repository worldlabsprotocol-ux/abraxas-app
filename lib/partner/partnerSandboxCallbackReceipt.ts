// FILE: lib/partner/partnerSandboxCallbackReceipt.ts
// Receipt-authoritative sandbox callback presentation — URL params are hints only.

import type { DecisionReceiptPublicView } from "@/lib/decisionReceipts/types";
import type { PartnerSandboxCallbackView } from "@/lib/partner/partnerSandboxCallback";
import { partnerFlowReceiptOutcomeHolderNote } from "@/lib/partner/partnerFlowReceiptOutcome";

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

export type PartnerSandboxStatusEmphasis = "neutral" | "positive" | "warning" | "negative";

export interface PartnerSandboxCallbackStatusRow {
  label: string;
  value: string;
  emphasis: PartnerSandboxStatusEmphasis;
}

export interface PartnerSandboxCallbackAction {
  label: string;
  href: string;
  variant: "primary" | "secondary";
}

export interface PartnerSandboxCallbackDisplay {
  headline: string;
  body: string;
  subheadline: string | null;
  subbody: string | null;
  trust_level: PartnerSandboxCallbackTrustLevel;
  receipt_confirmed: boolean;
  currently_acceptable_for_access: boolean;
  historically_authentic_approval: boolean;
  receipt: DecisionReceiptPublicView | null;
  /** Holder-visible caution (e.g. altered return link). */
  holder_link_caution: string | null;
  /** Technical URL-vs-receipt diagnostics for developer details. */
  url_mismatches: string[];
  acceptability_note: string | null;
  access_gate_note: string | null;
  holder_status_rows: PartnerSandboxCallbackStatusRow[];
  application_label: string | null;
  primary_action: PartnerSandboxCallbackAction;
  secondary_action: PartnerSandboxCallbackAction | null;
}

const SANDBOX_RETURN_ACTION: PartnerSandboxCallbackAction = {
  label: "Return to sandbox test",
  href: "/developers/integration-studio",
  variant: "primary",
};

const DOCS_ACTION: PartnerSandboxCallbackAction = {
  label: "How applications verify results",
  href: "/docs/partner-flow",
  variant: "secondary",
};

function formatApplicationLabel(partnerId: string): string {
  if (partnerId.startsWith("studio-accept-")) {
    return "Institutional sandbox test";
  }
  if (partnerId.length > 40) {
    return `${partnerId.slice(0, 36)}…`;
  }
  return partnerId;
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

function holderLinkCaution(url_mismatches: string[]): string | null {
  if (url_mismatches.length === 0) return null;
  return "This return link may have been altered. The signed record below is what Abraxas verified — your application must confirm it on the server before acting.";
}

function approvedStatusRows(receipt: DecisionReceiptPublicView): PartnerSandboxCallbackStatusRow[] {
  const currentlyOk = receipt.currently_valid === true;
  return [
    {
      label: "Recorded decision",
      value: receipt.decision_result === "approved" ? "Approved" : String(receipt.decision_result),
      emphasis: receipt.decision_result === "approved" ? "positive" : "negative",
    },
    {
      label: "Signature",
      value: receipt.signature_valid ? "Valid" : "Invalid",
      emphasis: receipt.signature_valid ? "positive" : "negative",
    },
    {
      label: "Current authorization",
      value: currentlyOk ? "Acceptable" : "Not acceptable",
      emphasis: currentlyOk ? "positive" : "warning",
    },
  ];
}

function baseFailureActions(): Pick<PartnerSandboxCallbackDisplay, "primary_action" | "secondary_action"> {
  return {
    primary_action: SANDBOX_RETURN_ACTION,
    secondary_action: DOCS_ACTION,
  };
}

export function resolvePartnerSandboxCallbackDisplay(input: {
  urlView: PartnerSandboxCallbackView;
  fetchStatus: PartnerSandboxReceiptFetchStatus;
  receipt: DecisionReceiptPublicView | null;
}): PartnerSandboxCallbackDisplay {
  const { urlView, fetchStatus, receipt } = input;
  const failureActions = baseFailureActions();

  if (urlView.forbidden_detected) {
    return {
      headline: "Return could not be trusted",
      body: "Sensitive data appeared in this link. Do not share or log the full URL.",
      subheadline: null,
      subbody: null,
      trust_level: "untrusted_url",
      receipt_confirmed: false,
      currently_acceptable_for_access: false,
      historically_authentic_approval: false,
      receipt: null,
      holder_link_caution: null,
      url_mismatches: [],
      acceptability_note: null,
      access_gate_note: null,
      holder_status_rows: [],
      application_label: null,
      ...failureActions,
    };
  }

  if (urlView.holder_outcome === "invalid_callback" || urlView.parse_errors.length > 0) {
    return {
      headline: "Return incomplete",
      body: "Required information was missing from this link. Changing the address bar does not create a verification result.",
      subheadline: null,
      subbody: null,
      trust_level: "incomplete_callback",
      receipt_confirmed: false,
      currently_acceptable_for_access: false,
      historically_authentic_approval: false,
      receipt: null,
      holder_link_caution: null,
      url_mismatches: [],
      acceptability_note: null,
      access_gate_note: null,
      holder_status_rows: [],
      application_label: null,
      ...failureActions,
    };
  }

  if (fetchStatus === "idle" || fetchStatus === "loading") {
    return {
      headline: "Checking your verification",
      body: "Loading the signed record from Abraxas…",
      subheadline: null,
      subbody: null,
      trust_level: "loading",
      receipt_confirmed: false,
      currently_acceptable_for_access: false,
      historically_authentic_approval: false,
      receipt: null,
      holder_link_caution: null,
      url_mismatches: [],
      acceptability_note: null,
      access_gate_note: null,
      holder_status_rows: [],
      application_label: null,
      primary_action: { label: "Please wait", href: "#", variant: "primary" },
      secondary_action: null,
    };
  }

  if (fetchStatus === "not_found") {
    return {
      headline: "Verification could not be confirmed",
      body: "No signed record was found for this reference. An approval status in the link alone is not proof of verification.",
      subheadline: null,
      subbody: null,
      trust_level: "not_found",
      receipt_confirmed: false,
      currently_acceptable_for_access: false,
      historically_authentic_approval: false,
      receipt: null,
      holder_link_caution: null,
      url_mismatches: [],
      acceptability_note: null,
      access_gate_note: null,
      holder_status_rows: [],
      application_label: null,
      ...failureActions,
    };
  }

  if (fetchStatus === "unavailable") {
    return {
      headline: "Verification temporarily unavailable",
      body: "Abraxas could not load the signed record right now. Try again in a moment.",
      subheadline: null,
      subbody: "Your application should not grant access from this page until the record can be confirmed on the server.",
      trust_level: "unavailable",
      receipt_confirmed: false,
      currently_acceptable_for_access: false,
      historically_authentic_approval: false,
      receipt: null,
      holder_link_caution: null,
      url_mismatches: [],
      acceptability_note: null,
      access_gate_note: null,
      holder_status_rows: [],
      application_label: null,
      ...failureActions,
    };
  }

  if (!receipt) {
    return {
      headline: "Verification could not be confirmed",
      body: "Receipt data was incomplete.",
      subheadline: null,
      subbody: null,
      trust_level: "not_found",
      receipt_confirmed: false,
      currently_acceptable_for_access: false,
      historically_authentic_approval: false,
      receipt: null,
      holder_link_caution: null,
      url_mismatches: [],
      acceptability_note: null,
      access_gate_note: null,
      holder_status_rows: [],
      application_label: null,
      ...failureActions,
    };
  }

  const url_mismatches = urlMismatchWarnings(urlView, receipt);
  const linkCaution = holderLinkCaution(url_mismatches);
  const application_label = formatApplicationLabel(receipt.partner_id);

  if (receipt.status === "expired" || receipt.status === "revoked") {
    const historic = receipt.signature_valid === true && receipt.decision_result === "approved";
    return {
      headline: receipt.status === "revoked" ? "Verification no longer valid" : "Verification expired",
      body: historic
        ? "An earlier approval was recorded, but this result is no longer active."
        : "This signed record is no longer active.",
      subheadline: "A new authorization may be needed",
      subbody: "The requesting application must run a fresh verification before granting access.",
      trust_level: "not_currently_acceptable",
      receipt_confirmed: false,
      currently_acceptable_for_access: false,
      historically_authentic_approval: historic,
      receipt,
      holder_link_caution: linkCaution,
      url_mismatches,
      acceptability_note: null,
      access_gate_note: null,
      holder_status_rows: approvedStatusRows({ ...receipt, currently_valid: false }),
      application_label,
      ...failureActions,
    };
  }

  if (receipt.signature_valid === false) {
    return {
      headline: "Verification could not be trusted",
      body: "The signed record failed cryptographic verification.",
      subheadline: null,
      subbody: "The requesting application should treat this as failed and must not grant access from the link alone.",
      trust_level: "invalid_signature",
      receipt_confirmed: false,
      currently_acceptable_for_access: false,
      historically_authentic_approval: false,
      receipt,
      holder_link_caution: linkCaution,
      url_mismatches,
      acceptability_note: null,
      access_gate_note: null,
      holder_status_rows: [],
      application_label,
      ...failureActions,
    };
  }

  if (receipt.decision_result === "denied" || receipt.decision_result === "manual_review") {
    return {
      headline: receipt.decision_result === "manual_review"
        ? "Verification pending review"
        : "Verification not approved",
      body: receipt.decision_result === "manual_review"
        ? "This result is not final yet."
        : "The signed record does not show an approved result for this request.",
      subheadline: null,
      subbody: "The requesting application should wait for a final outcome before granting access.",
      trust_level: "denied",
      receipt_confirmed: false,
      currently_acceptable_for_access: false,
      historically_authentic_approval: false,
      receipt,
      holder_link_caution: linkCaution,
      url_mismatches,
      acceptability_note: null,
      access_gate_note: null,
      holder_status_rows: [
        {
          label: "Recorded decision",
          value: receipt.decision_result === "manual_review" ? "Pending review" : "Not approved",
          emphasis: "warning",
        },
      ],
      application_label,
      ...failureActions,
    };
  }

  const currentlyValid = receipt.currently_valid === true;
  const sandbox = receipt.production_usable === false || receipt.decision_context === "sandbox_only";
  const holder_status_rows = approvedStatusRows(receipt);

  if (!currentlyValid) {
    return {
      headline: "Verification record found",
      body: "Your earlier wallet-control approval has a valid signature.",
      subheadline: "A new authorization may be needed",
      subbody:
        "This record is not currently acceptable for granting access. The requesting application must check the latest verification status.",
      trust_level: sandbox ? "verified_sandbox" : "not_currently_acceptable",
      receipt_confirmed: true,
      currently_acceptable_for_access: false,
      historically_authentic_approval: true,
      receipt,
      holder_link_caution: linkCaution,
      url_mismatches,
      acceptability_note: null,
      access_gate_note: null,
      holder_status_rows,
      application_label,
      primary_action: {
        label: "Start a new verification",
        href: "/developers/integration-studio",
        variant: "primary",
      },
      secondary_action: DOCS_ACTION,
    };
  }

  const reuseNote = partnerFlowReceiptOutcomeHolderNote(urlView.hints.receipt_outcome);

  return {
    headline: "Verification complete",
    body: "Your wallet-control check succeeded. The requesting application must confirm this signed result on its server before allowing access.",
    subheadline: null,
    subbody: reuseNote,
    trust_level: sandbox ? "verified_sandbox" : "verified",
    receipt_confirmed: true,
    currently_acceptable_for_access: true,
    historically_authentic_approval: true,
    receipt,
    holder_link_caution: linkCaution,
    url_mismatches,
    acceptability_note: sandbox
      ? "Sandbox environment — your application validates this record with its sandbox API key."
      : null,
    access_gate_note: null,
    holder_status_rows,
    application_label,
    primary_action: SANDBOX_RETURN_ACTION,
    secondary_action: DOCS_ACTION,
  };
}
