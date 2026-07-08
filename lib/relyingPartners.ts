// FILE: lib/relyingPartners.ts
// External relying parties — first unaffiliated production integrations.

export interface RelyingPartnerRecord {
  partner_id: string;
  company: string;
  category: string;
  status: "pilot" | "live" | "recruiting";
  policy_id: string;
  policy_name: string;
  description: string;
  api_entry: string;
  consent_flow: boolean;
  external: boolean;
  launched_at?: string;
}

/** First external relying party — unaffiliated from Abraxas/Cielo first-party flows. */
export const RELYING_PARTNERS: RelyingPartnerRecord[] = [
  {
    partner_id: "meridian-private-credit",
    company: "Meridian Private Credit",
    category: "Private credit / lending",
    status: "pilot",
    policy_id: "meridian-investor-gate-v1",
    policy_name: "Meridian investor eligibility",
    description:
      "First external relying party on Abraxas. Clears private-credit onboarding using portable identity, wallet binding, and sanctions screening claims — not document re-upload.",
    api_entry: "POST /api/v1/verification-requests",
    consent_flow: true,
    external: true,
    launched_at: "2026-07-08",
  },
];

export function getRelyingPartner(partnerId: string): RelyingPartnerRecord | undefined {
  return RELYING_PARTNERS.find(p => p.partner_id === partnerId);
}

export function getExternalRelyingPartners(): RelyingPartnerRecord[] {
  return RELYING_PARTNERS.filter(p => p.external);
}
