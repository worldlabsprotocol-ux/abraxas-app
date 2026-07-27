// FILE: lib/verificationParadeIndustries.ts
// Industries in the repeated verification parade — used in hero + verification demos.

export interface VerificationParadeIndustry {
  id: string;
  label: string;
  gate: string;
}

export const VERIFICATION_PARADE_INDUSTRIES: VerificationParadeIndustry[] = [
  { id: "cannabis", label: "Cannabis", gate: "Age + state ID at checkout" },
  { id: "spirits", label: "Spirits", gate: "Upload ID for delivery" },
  { id: "exchange", label: "Exchange", gate: "Full KYC before trading" },
  { id: "casino", label: "Casino", gate: "Age verify at signup" },
  { id: "hotel", label: "Hotel", gate: "ID scan at check-in" },
  { id: "lender", label: "Lender", gate: "Identity proof for credit" },
  { id: "insurance", label: "Insurance", gate: "Re-verify for quote" },
];

export const VERIFICATION_PARADE_LABELS = VERIFICATION_PARADE_INDUSTRIES.map(i => i.label);
