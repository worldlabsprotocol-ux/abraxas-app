"use client";
// FILE: app/partners/page.tsx
// Real verification partner directory, using the actual three
// partners that exist (Utila, CV5 Capital, HeroSwap), honestly
// categorized.

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

interface Partner {
  name: string;
  category: string;
  description: string;
  appliesTo: string;
  url: string;
  isVerificationPartner: boolean;
}

const PARTNERS: Partner[] = [
  {
    name: "Utila",
    category: "Custody",
    description: "MPC-based custody infrastructure for assets verified on Abraxas, stronger protection than a typical self-custody wallet.",
    appliesTo: "All verified assets",
    url: "https://utila.io",
    isVerificationPartner: true,
  },
  {
    name: "CV5 Capital",
    category: "Fund Structure",
    description: "CIMA-regulated fund structure partner, advises on the legal structure behind investment offerings.",
    appliesTo: "Fund structure and compliance advisory",
    url: "#",
    isVerificationPartner: true,
  },
  {
    name: "HeroSwap",
    category: "Swap Utility",
    description: "Cross-chain swap, a general crypto utility, separate from asset verification. Not a verification partner.",
    appliesTo: "The Swap page only",
    url: "https://heroswap.com",
    isVerificationPartner: false,
  },
];

function PartnerCard({ partner }: { partner: Partner }) {
  return (
    <div style={{ padding: "1.125rem", borderRadius: 12,
                   border: "1px solid var(--border)",
                   background: partner.isVerificationPartner ? "var(--surface)" : "var(--surface-raised)" }}>
      <div style={{ display: "flex", justifyContent: "space-between",
                     alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
        <div>
          <div style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 700,
                         color: "var(--text-primary)" }}>
            {partner.name}
          </div>
          <div style={{ fontFamily: MONO, fontSize: "0.6rem", fontWeight: 700,
                          color: partner.isVerificationPartner ? ACCENT : "var(--text-muted)",
                          letterSpacing: "0.06em", marginTop: "0.2rem" }}>
            {partner.category.toUpperCase()}
          </div>
        </div>
        {partner.url !== "#" && (
          <a href={partner.url} target="_blank" rel="noopener noreferrer"
             style={{ fontFamily: FONT, fontSize: "0.72rem", color: ACCENT, textDecoration: "underline" }}>
            Visit site →
          </a>
        )}
      </div>
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)",
                   lineHeight: 1.6, margin: "0.625rem 0 0.375rem" }}>
        {partner.description}
      </p>
      {partner.isVerificationPartner && (
        <div style={{ fontFamily: FONT, fontSize: "0.7rem", color: "var(--text-muted)" }}>
          Applies to: {partner.appliesTo}
        </div>
      )}
    </div>
  );
}

export default function PartnersPage() {
  const verificationPartners = PARTNERS.filter(p => p.isVerificationPartner);
  const utilityPartners = PARTNERS.filter(p => !p.isVerificationPartner);

  return (
    <RedesignPage maxWidth={760}>
      <PageHeader
        eyebrow="Partners"
        title="Who actually backs the verification"
        subtitle="A short, honest list. Abraxas works with a small number of real partners today, not a directory padded to look bigger than it is. This page grows as real relationships are added, not before."
      />

      <ContentCard title="Verification and trust partners">
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {verificationPartners.map(p => (
            <PartnerCard key={p.name} partner={p} />
          ))}
        </div>
      </ContentCard>

      <ContentCard title="General utility, not verification">
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {utilityPartners.map(p => (
            <PartnerCard key={p.name} partner={p} />
          ))}
        </div>
      </ContentCard>
    </RedesignPage>
  );
}
