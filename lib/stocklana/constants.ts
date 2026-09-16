// FILE: lib/stocklana/constants.ts
// Stocklana — Solana tokenized-stock eligibility demo (Abraxas hackathon submission).

export const STOCKLANA_PARTNER_ID = "stocklana-demo" as const;
export const STOCKLANA_ELIGIBILITY_POLICY_ID = "stocklana-non-us-eligibility-v1" as const;

export const STOCKLANA_APP_PATH = "/stocklana" as const;
export const STOCKLANA_CALLBACK_PATH = "/stocklana/callback" as const;

export const STOCKLANA_BRAND = {
  name: "Stocklana",
  tagline: "Curated Solana SPL mints — gated by privacy-preserving Abraxas eligibility.",
  website: "https://prestocks.com/",
} as const;

export const STOCKLANA_MINT_IDENTITY_NOTICE =
  "On-chain checks confirm a Token-2022 mint account exists. Abraxas does not attest issuer identity, SPV backing, or that a mint belongs to any specific vendor.";

/** Demo policy blocks US residency — not a substitute for issuer KYC/AML. */
export const STOCKLANA_JURISDICTION_NOTICE =
  "This sandbox demo blocks the purchase path when Abraxas residency verification resolves to the United States. Issuer jurisdiction rules are not verified on-chain.";

export const STOCKLANA_DEMO_DISCLAIMER =
  "Hackathon demo on Abraxas sandbox infrastructure. Not live trading, not a securities offering, and not legal advice. Abraxas returns a signed eligibility receipt — not raw identity documents, birth dates, or addresses.";

export const STOCKLANA_VERIFICATION_SPLIT_NOTICE =
  "Solana wallet connection is for the Stocklana app context only. Abraxas hosted verification uses the existing Passport + zkLogin (Sui) holder session — not your Solana wallet signature.";

export const STOCKLANA_NO_PRESTOCKS_API_NOTICE =
  "No issuer partner API is used for quotes or mint discovery. Mint addresses are curated from public listings and verified on-chain via Solana RPC only — not live market data.";
