// FILE: lib/assurance/transactionRequirement.ts
// Transaction obligations — independent from eligibility evidence quality.

/** What must happen at transaction time; does not raise credential assurance. */
export type TransactionRequirement =
  | "NO_ADDITIONAL_CHECK"
  | "STEP_UP_REQUIRED"
  | "TRANSACTION_ID_REQUIRED";

export interface TransactionRequirementDef {
  requirement: TransactionRequirement;
  label: string;
  shortLabel: string;
  description: string;
}

export const TRANSACTION_REQUIREMENT_OPTIONS: TransactionRequirementDef[] = [
  {
    requirement: "NO_ADDITIONAL_CHECK",
    label: "No additional check",
    shortLabel: "No additional check",
    description: "The partner policy does not require an extra transaction-time step beyond the Abraxas receipt.",
  },
  {
    requirement: "STEP_UP_REQUIRED",
    label: "Step-up required",
    shortLabel: "Step-up required",
    description: "A stronger or renewed verification may be required before the transaction can proceed.",
  },
  {
    requirement: "TRANSACTION_ID_REQUIRED",
    label: "Transaction ID required",
    shortLabel: "Transaction ID required",
    description: "The merchant must still conduct any legally required ID check at purchase, pickup, delivery, or entry — independent of pre-verification assurance.",
  },
];

const KNOWN_TRANSACTION_REQUIREMENTS = new Set<TransactionRequirement>(
  TRANSACTION_REQUIREMENT_OPTIONS.map((entry) => entry.requirement),
);

export function isKnownTransactionRequirement(
  value: string | null | undefined,
): value is TransactionRequirement {
  return typeof value === "string" && KNOWN_TRANSACTION_REQUIREMENTS.has(value as TransactionRequirement);
}

export function transactionRequirementDef(
  requirement: TransactionRequirement,
): TransactionRequirementDef {
  return TRANSACTION_REQUIREMENT_OPTIONS.find((entry) => entry.requirement === requirement)
    ?? TRANSACTION_REQUIREMENT_OPTIONS[0];
}
