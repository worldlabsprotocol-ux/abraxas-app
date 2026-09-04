// FILE: lib/partner/partnerFlowDemoMode.ts
// Safe demonstration configuration — cannot activate in production accidentally.

import { getPublicAppOrigin } from "@/lib/app/publicAppOrigin";

const DEMO_FLAG = process.env.PARTNER_FLOW_DEMO_MODE === "true";
const NODE_ENV = process.env.NODE_ENV ?? "development";
const VERCEL_ENV = process.env.VERCEL_ENV ?? "";
const APP_URL = getPublicAppOrigin();

function isProductionRuntime(): boolean {
  if (NODE_ENV === "production" && VERCEL_ENV === "production") return true;
  if (APP_URL.includes("abraxasworld.xyz") && !APP_URL.includes("git-")) return true;
  return false;
}

export function isPartnerFlowDemoModeActive(): boolean {
  if (!DEMO_FLAG) return false;
  if (isProductionRuntime()) return false;
  return true;
}

export const PARTNER_FLOW_DEMO_PARTNER_ID = "good-trouble-cannabis";
export const PARTNER_FLOW_DEMO_POLICY_ID = "good-trouble-retail-v1";

export function buildPartnerFlowDemoVerifyUrl(returnUrl: string): string {
  if (!isPartnerFlowDemoModeActive()) {
    throw new Error("Partner flow demo mode is not active in this environment");
  }
  const params = new URLSearchParams({
    partner_id: PARTNER_FLOW_DEMO_PARTNER_ID,
    policy_id: PARTNER_FLOW_DEMO_POLICY_ID,
    return_url: returnUrl,
    demo: "1",
  });
  return `${APP_URL.replace(/\/$/, "")}/partner/verify?${params.toString()}`;
}
