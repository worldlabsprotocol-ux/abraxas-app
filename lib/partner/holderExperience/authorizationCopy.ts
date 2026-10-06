// FILE: lib/partner/holderExperience/authorizationCopy.ts
// Concise holder authorization copy — policy-derived, jargon-free primary surface.

import { inferPolicyPackFromPolicyId } from "@/lib/partner/launchpad/policyPacks";
import { buildHolderRequestPresentation } from "@/lib/product/holderRequestPresentation";
import type { HolderRequestBrief } from "./brief";
import { humanizeHolderResult } from "./presentation";

export interface HolderAuthorizationCopy {
  headline: string;
  supporting: string;
  confirmLabel: string;
  reuseLine: string | null;
  checkingLine: string;
  successTitle: string;
  successSharedLabel: string;
  successSharedValue: string;
  successPrivateLine: string;
  disclosureTitle: string;
  disclosureShared: string[];
  disclosureWithheld: string[];
}

function walletControlWithheld(): string[] {
  return [
    "Wallet address",
    "Other connected wallets",
    "Private keys",
    "Seed phrase",
    "Personal identity information",
  ];
}

export function buildHolderAuthorizationCopy(input: {
  partnerName: string;
  policyId: string;
  brief: HolderRequestBrief;
  proofSource?: string | null;
}): HolderAuthorizationCopy {
  const pack = inferPolicyPackFromPolicyId(input.policyId);
  const presentation = buildHolderRequestPresentation(input.partnerName, input.policyId);
  const resultLabel = humanizeHolderResult(pack?.disclosed_result ?? input.brief.result);

  if (pack?.id === "wallet_control") {
    return {
      headline: `${input.partnerName} wants to confirm you control a verified wallet.`,
      supporting: "They'll only receive Yes or No. Your wallet address and private information stay private.",
      confirmLabel: "Confirm",
      reuseLine: input.proofSource ?? "Using your existing verified wallet",
      checkingLine: "Checking your verified wallet…",
      successTitle: "Confirmed",
      successSharedLabel: "Wallet control",
      successSharedValue: "Yes",
      successPrivateLine: "Your wallet address and private information were not shared.",
      disclosureTitle: "What was shared?",
      disclosureShared: ["Wallet control: Yes"],
      disclosureWithheld: walletControlWithheld(),
    };
  }

  const sharedPreview = presentation.sharedPreview[0]?.label ?? resultLabel;
  return {
    headline: `${input.partnerName} wants to confirm ${presentation.requestHeadline.replace(/^.* wants to confirm /i, "").replace(/\.$/, "")}.`,
    supporting: "They'll only receive the approved result. Sensitive details stay private.",
    confirmLabel: "Confirm",
    reuseLine: input.proofSource ?? null,
    checkingLine: input.proofSource ? "Checking your existing proof…" : "Checking this request…",
    successTitle: "Confirmed",
    successSharedLabel: sharedPreview.replace(/\s*\(if approved\)$/i, ""),
    successSharedValue: "Yes",
    successPrivateLine: "Sensitive evidence and personal details were not shared.",
    disclosureTitle: "What was shared?",
    disclosureShared: [`${resultLabel}: Yes`],
    disclosureWithheld: input.brief.withheld,
  };
}
