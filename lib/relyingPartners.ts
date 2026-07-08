// FILE: lib/relyingPartners.ts
// Relying party registry — internal sandbox demo + future external partners.

import { SANDBOX_DISCLAIMER } from "@/lib/credentials/sandboxClaims";

export interface RelyingPartnerRecord {
  partner_id: string;
  company: string;
  category: string;
  status: "sandbox" | "pilot" | "live" | "recruiting";
  policy_id: string;
  policy_name: string;
  description: string;
  disclaimer?: string;
  api_entry: string;
  consent_flow: boolean;
  /** True only for separate organizations with signed agreements using abx_live_ keys. */
  external: boolean;
  sandbox_only?: boolean;
  launched_at?: string;
}

/** Internal sandbox — demonstrates Tier 3 policy + consent flow. Not an external partner. */
export const RELYING_PARTNERS: RelyingPartnerRecord[] = [
  {
    partner_id: "meridian-private-credit",
    company: "Abraxas Partner Sandbox",
    category: "Sandbox / demonstration",
    status: "sandbox",
    policy_id: "meridian-investor-gate-v1",
    policy_name: "Partner sandbox eligibility (demo)",
    description:
      "Demonstration policy for testing transaction-specific eligibility. Exercises portable identity, wallet binding, and sandbox screening claims — not document re-upload.",
    disclaimer: SANDBOX_DISCLAIMER,
    api_entry: "POST /api/v1/verification-requests",
    consent_flow: true,
    external: false,
    sandbox_only: true,
  },
];

export function getRelyingPartner(partnerId: string): RelyingPartnerRecord | undefined {
  return RELYING_PARTNERS.find(p => p.partner_id === partnerId);
}

/** Separate organizations operating with issued abx_live_ keys — excludes internal sandbox. */
export function getExternalRelyingPartners(): RelyingPartnerRecord[] {
  return RELYING_PARTNERS.filter(p => p.external);
}

export function getSandboxPartners(): RelyingPartnerRecord[] {
  return RELYING_PARTNERS.filter(p => p.sandbox_only);
}

export function getSandboxPartner(): RelyingPartnerRecord | undefined {
  return RELYING_PARTNERS.find(p => p.sandbox_only);
}
