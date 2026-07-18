"use client";
// FILE: components/integrations/ExternalRelyingPartnersList.tsx
// Fetches DB-backed external relying parties for public display.

import { useEffect, useState } from "react";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "var(--accent)";

interface Partner {
  partner_id: string;
  company: string;
  description: string;
  status: string;
  policy_id: string;
  api_entry: string;
}

export function ExternalRelyingPartnersList() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/partners/registry")
      .then(r => r.json())
      .then(data => setPartners(data.partners ?? []))
      .catch(() => setPartners([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  if (partners.length === 0) {
    return (
      <p style={body}>
        No external relying parties are publicly listed yet. Abraxas is pilot-ready — recruiting the first
        unaffiliated organization to operate with an issued <code style={{ fontFamily: MONO, fontSize: "0.72rem" }}>abx_live_</code> key
        for one narrow workflow.
      </p>
    );
  }

  return (
    <>
      {partners.map(partner => (
        <div key={partner.partner_id} style={{
          padding: "0.85rem", borderRadius: 12,
          background: "rgba(232,197,71,0.06)", border: "1px solid rgba(232,197,71,0.28)",
          marginBottom: "0.65rem",
        }}>
          <div style={{ fontFamily: FONT, fontSize: "0.92rem", fontWeight: 800, color: ACCENT, marginBottom: 4 }}>
            {partner.company}
          </div>
          <p style={{ ...body, margin: "0 0 0.5rem" }}>{partner.description}</p>
          <div style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)" }}>
            Policy {partner.policy_id} · {partner.api_entry} · Status {partner.status}
          </div>
        </div>
      ))}
    </>
  );
}

const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.75,
  margin: 0,
};
