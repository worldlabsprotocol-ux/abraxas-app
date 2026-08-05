// FILE: lib/protocolIntegrations.ts
// External protocol integration flywheel — honest status labels.

import { SITE_URL } from "@/lib/siteUrl";

export type IntegrationStatus = "live" | "pilot" | "loi" | "recruiting";

export interface ProtocolIntegration {
  id: string;
  name: string;
  category: string;
  status: IntegrationStatus;
  description: string;
  capability: string;
  api?: string;
  /** Pilot landing page or docs */
  href?: string;
  website?: string;
}

export const INTEGRATION_SDK_SNIPPET = `// 1) Check if user meets your policy before an action
const check = await fetch("${SITE_URL}/api/verification/check-level", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ sui_address: walletAddress, action: "book_asset" }),
});
const level = await check.json();
if (level.needsDeepVerification) {
  // Prompt ID check — user completes Veriff once
}

// 2) Partner flow: create request → user consents → get decision
const req = await fetch("${SITE_URL}/api/v1/verification-requests", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": process.env.ABRAXAS_PARTNER_API_KEY,
  },
  body: JSON.stringify({
    policy_id: "abraxas-rwa-us-v1",
    requested_action: "subscribe_to_offering",
  }),
});
const { request_id, consent_url } = await req.json();

// 3) Re-check decision before settlement
const status = await fetch(
  \`${SITE_URL}/api/v1/decisions/\${decisionId}/status\`,
  { headers: { "X-API-Key": process.env.ABRAXAS_PARTNER_API_KEY } }
);`;

export const PROTOCOL_INTEGRATIONS: ProtocolIntegration[] = [
  {
    id: "abraxas-app",
    name: "Abraxas App",
    category: "First-party",
    status: "live",
    description: "Cielo booking, passport, and asset terminal — internal dogfood of the full loop.",
    capability: "Book → confirm → USDC pay → receipt",
    api: "GET /api/trust/status",
  },
  {
    id: "ail-api",
    name: "AIL Public API",
    category: "Developer",
    status: "live",
    description: "Trust status, credential verify, passport read, intent proofs.",
    capability: "4-line wallet trust check",
    api: "GET /api/trust/status · POST /api/credentials/verify",
  },
  {
    id: "cielo-checkout",
    name: "Cielo Stablecoin Checkout",
    category: "Hospitality RWA",
    status: "live",
    description: "Live USDC payment rail for verified short-term rental on Sui mainnet.",
    capability: "One-click zkLogin pay + on-chain verify",
    api: "GET /api/cielo/config",
  },
  {
    id: "rwa-marketplace",
    name: "External RWA Marketplace",
    category: "Design partner slot",
    status: "recruiting",
    description: "Accept Abraxas Passport for investor eligibility without re-KYC.",
    capability: "Passport gate at checkout",
    api: "POST /api/credentials/verify",
  },
  {
    id: "defi-lending",
    name: "DeFi / Private Credit Protocol",
    category: "Design partner slot",
    status: "recruiting",
    description: "Collateral verification + identity tier for borrow against verified RWAs.",
    capability: "Enhanced trust tier gate",
    api: "GET /api/sui/passport",
  },
  {
    id: "music-royalty",
    name: "Music Royalty Platform",
    category: "Pipeline",
    status: "pilot",
    description: "Catalog ownership attestation via Abraxas music audit intake.",
    capability: "Royalty stamp + ownership chain",
    api: "/music-audit",
    href: "/music-audit",
  },
  {
    id: "good-trouble-cannabis",
    name: "Good Trouble Cannabis",
    category: "Regulated retail (pilot)",
    status: "pilot",
    description:
      "Kansas City organic cultivator (est. 2022). Passport retail eligibility + batch provenance fixtures for cannabis SDK.",
    capability: "Age-gated verify + COA batch registry",
    api: "POST /api/credentials/verify · GET /api/good-trouble/batch",
    href: "/good-trouble",
    website: "https://www.goodtroublecanna.com/",
  },
];

export const DESIGN_PARTNER_CRITERIA = [
  "Clear workflow where reusable identity or asset proof reduces friction",
  "Willingness to pilot with real users (even small volume)",
  "Defined success metric (conversion, time-to-verify, cost per check)",
  "Permission to name publicly after pilot success",
] as const;

export const STATUS_LABEL: Record<IntegrationStatus, string> = {
  live: "Live",
  pilot: "Pilot",
  loi: "LOI signed",
  recruiting: "Recruiting",
};

export const STATUS_COLOR: Record<IntegrationStatus, string> = {
  live: "#10B981",
  pilot: "#3B82F6",
  loi: "#8B5CF6",
  recruiting: "#F59E0B",
};
