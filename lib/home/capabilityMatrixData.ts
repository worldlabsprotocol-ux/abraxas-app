// Honest product capability matrix — no invented adoption metrics.

export type CapabilityState =
  | "available"
  | "pilot"
  | "in_development"
  | "operator_review"
  | "unavailable";

export type CapabilityRow = {
  id: string;
  capability: string;
  state: CapabilityState;
  surface: string;
  evidenceHref?: string;
};

export const CAPABILITY_STATE_LABEL: Record<CapabilityState, string> = {
  available: "Available",
  pilot: "Pilot",
  in_development: "In development",
  operator_review: "Operator review required",
  unavailable: "Unavailable",
};

export const PRODUCT_CAPABILITY_MATRIX: CapabilityRow[] = [
  {
    id: "passport",
    capability: "Abraxas Passport (holder evidence & consent)",
    state: "available",
    surface: "/passport",
    evidenceHref: "/docs/passport-spec",
  },
  {
    id: "partner-flow",
    capability: "Partner Flow (hosted eligibility requests)",
    state: "pilot",
    surface: "/docs/partner-flow",
    evidenceHref: "/docs/partner-flow-api",
  },
  {
    id: "receipts",
    capability: "Signed decision receipts",
    state: "available",
    surface: "/verify?mode=receipt",
    evidenceHref: "/docs/relying-party-verify",
  },
  {
    id: "independent-verify",
    capability: "Independent receipt verification",
    state: "available",
    surface: "/verify",
    evidenceHref: "/docs/relying-party-verify",
  },
  {
    id: "revocation",
    capability: "Revocation & freshness enforcement",
    state: "available",
    surface: "Policy engine + verify APIs",
    evidenceHref: "/docs/receipt-lifecycle-events",
  },
  {
    id: "sandbox",
    capability: "Sandbox integration & test applications",
    state: "available",
    surface: "/developers/integration-studio",
    evidenceHref: "/docs/sandbox-conformance",
  },
  {
    id: "production",
    capability: "Reviewed production activation",
    state: "operator_review",
    surface: "/developers/launchpad",
    evidenceHref: "/docs/production-review",
  },
  {
    id: "solana-devnet",
    capability: "Solana devnet gate evidence (labeled devnet)",
    state: "pilot",
    surface: "/proofs/solana-devnet",
    evidenceHref: "/docs/solana-onchain-eligibility-gate",
  },
];
