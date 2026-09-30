// FILE: lib/partner/launchpad/platformOptions.ts
// Merchant-facing platform choices backed by real starter-kit capabilities.

import type { StarterKitPlatform } from "@/lib/partner/starterKit/contract";

export interface MerchantPlatformOption {
  id: StarterKitPlatform | "other_api";
  label: string;
  description: string;
  starterKitPlatform: StarterKitPlatform;
}

export const MERCHANT_CONNECT_PLATFORMS: MerchantPlatformOption[] = [
  {
    id: "wix_velo",
    label: "Wix",
    description: "Add a small backend module and trigger from your existing age gate. Secrets stay in Wix Secrets Manager.",
    starterKitPlatform: "wix_velo",
  },
  {
    id: "nextjs",
    label: "Next.js",
    description: "App Router server routes keep credentials off the client.",
    starterKitPlatform: "nextjs",
  },
  {
    id: "express",
    label: "Express / Node",
    description: "Standard Node HTTP server integration.",
    starterKitPlatform: "express",
  },
  {
    id: "serverless",
    label: "Serverless",
    description: "Vercel, Cloudflare Workers, or Netlify Functions.",
    starterKitPlatform: "serverless",
  },
  {
    id: "universal_https",
    label: "Universal HTTPS",
    description: "Any backend with HTTPS and server-side verification.",
    starterKitPlatform: "universal_https",
  },
  {
    id: "other_api",
    label: "Other website / API",
    description: "Use the universal HTTPS kit when your stack is not listed.",
    starterKitPlatform: "universal_https",
  },
];

export const WIX_MERCHANT_GUIDANCE = {
  headline: "Minimal Wix integration",
  principles: [
    "Keep Abraxas code in backend web modules only — never in page publish paths.",
    "Store credentials in Wix Secrets Manager. Frontend pages call your backend only.",
    "Trigger Hosted Partner Flow from your existing age-gate popup without replacing site architecture.",
    "Handle the return on a dedicated result page or lightbox callback handler.",
    "Abraxas hosts verification; your site only starts the flow and verifies the receipt server-side.",
  ],
  files: [
    "backend/abraxas.web.js — start flow, verify callback, verify receipt",
    "backend/http-functions.js — HTTPS callback endpoint (optional webhook handler)",
    "pages/AgeVerificationResult — read query params and call backend verify",
  ],
  avoid: [
    "Do not embed API keys or receipt logic in frontend page code.",
    "Do not modify Wix theme publish files with Abraxas dependencies.",
    "Do not auto-redirect customers after verification — use explicit Return to Partner behavior.",
  ],
} as const;

export function resolveMerchantPlatform(id: string): MerchantPlatformOption | null {
  return MERCHANT_CONNECT_PLATFORMS.find((item) => item.id === id) ?? null;
}
