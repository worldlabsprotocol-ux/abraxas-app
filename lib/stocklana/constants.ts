// FILE: lib/stocklana/constants.ts
// Stocklana — Solana tokenized-stock eligibility demo (Abraxas hackathon submission).

export const STOCKLANA_PARTNER_ID = "stocklana-demo" as const;
export const STOCKLANA_ELIGIBILITY_POLICY_ID = "stocklana-non-us-eligibility-v1" as const;

export const STOCKLANA_APP_PATH = "/stocklana" as const;
export const STOCKLANA_CALLBACK_PATH = "/stocklana/callback" as const;

export const STOCKLANA_BRAND = {
  name: "Stocklana",
  tagline: "Tokenized pre-IPO exposure on Solana — gated by privacy-preserving eligibility.",
  website: "https://prestocks.com/",
} as const;

/** PreStocks publishes jurisdiction limits; Abraxas does not replace issuer KYC/AML. */
export const STOCKLANA_JURISDICTION_NOTICE =
  "PreStocks states its products are intended for investors outside the United States. This demo blocks a permitted purchase path when Abraxas residency verification resolves to the United States.";

export const STOCKLANA_DEMO_DISCLAIMER =
  "Hackathon demo on Abraxas sandbox infrastructure. Not live trading, not a securities offering, and not legal advice. Abraxas returns a signed eligibility receipt — not raw identity documents, birth dates, or addresses.";

export const STOCKLANA_VERIFICATION_SPLIT_NOTICE =
  "Solana wallet connection is for the Stocklana app context only. Abraxas hosted verification uses the existing Passport + zkLogin (Sui) holder session — not your Solana wallet signature.";

export const STOCKLANA_NO_PRESTOCKS_API_NOTICE =
  "PreStocks does not publish a partner API for asset quotes or mint discovery. This demo uses publicly listed Solana mint addresses and verifies them on-chain via Solana RPC — not scraped or invented market data.";
