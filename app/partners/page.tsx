"use client";
// FILE: app/partners/page.tsx
// Real verification partner directory, using the actual three
// partners that exist (Utila, CV5 Capital, HeroSwap), honestly
// categorized. HeroSwap is a general utility integration, not a
// verification partner, and is labeled as such rather than lumped in
// to make the directory look bigger than it is.

import { BottomNav } from "@/components/BottomNav";
import { LiveBackground } from "@/components/LiveBackground";

const S = "system-ui,-apple-system,sans-serif";
const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const G = "#10B981";
const BDR = "var(--border)";

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
    appliesTo: "Reg D 506(c) offerings",
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

export default function PartnersPage() {
  const verificationPartners = PARTNERS.filter(p => p.isVerificationPartner);
  const utilityPartners = PARTNERS.filter(p => !p.isVerificationPartner);

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", color:"var(--text-primary)" }}>
      <LiveBackground />
      <div style={{ padding:"1rem clamp(1rem,3vw,1.5rem)", borderBottom:`1px solid ${BDR}`,
                     display:"flex", alignItems:"center", gap:"0.5rem" }}>
        <svg width={20} height={20} viewBox="0 0 40 40" fill="none">
          <polygon points="20,2 38,20 20,38 2,20" stroke={G} strokeWidth="2" fill="none"/>
          <polygon points="20,8 32,20 20,32 8,20" stroke={G} strokeWidth="1.5" fill={`${G}15`}/>
          <circle cx="20" cy="20" r="3" fill={G}/>
        </svg>
        <span style={{ fontFamily:S, fontSize:"0.85rem", fontWeight:700 }}>Partners</span>
      </div>

      <div style={{ maxWidth:760, margin:"0 auto", padding:"2rem clamp(1rem,3vw,1.5rem)" }}>
        <h1 style={{ fontFamily:S, fontSize:"1.6rem", fontWeight:800,
                      margin:"0 0 0.5rem" }}>
          Who actually backs the verification
        </h1>
        <p style={{ fontFamily:S, fontSize:"0.85rem", color:"var(--text-secondary)",
                     lineHeight:1.7, marginBottom:"2rem", maxWidth:560 }}>
          A short, honest list. Abraxas works with a small number of real
          partners today, not a directory padded to look bigger than it is.
          This page grows as real relationships are added, not before.
        </p>

        <div style={{ fontFamily:M, fontSize:"0.68rem", fontWeight:700,
                       color:G, letterSpacing:"0.08em", marginBottom:"0.75rem" }}>
          VERIFICATION & TRUST PARTNERS
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem", marginBottom:"2rem" }}>
          {verificationPartners.map(p => (
            <div key={p.name} style={{ padding:"1.125rem", borderRadius:10,
                                          border:`1px solid ${BDR}`, background:"var(--surface)" }}>
              <div style={{ display:"flex", justifyContent:"space-between",
                             alignItems:"flex-start", flexWrap:"wrap", gap:"0.5rem" }}>
                <div>
                  <div style={{ fontFamily:S, fontSize:"0.95rem", fontWeight:700 }}>{p.name}</div>
                  <div style={{ fontFamily:M, fontSize:"0.6rem", fontWeight:700, color:G,
                                  letterSpacing:"0.06em", marginTop:"0.2rem" }}>
                    {p.category.toUpperCase()}
                  </div>
                </div>
                {p.url !== "#" && (
                  <a href={p.url} target="_blank" rel="noopener noreferrer"
                     style={{ fontFamily:S, fontSize:"0.72rem", color:G, textDecoration:"underline" }}>
                    Visit site →
                  </a>
                )}
              </div>
              <p style={{ fontFamily:S, fontSize:"0.78rem", color:"var(--text-secondary)",
                           lineHeight:1.6, margin:"0.625rem 0 0.375rem" }}>
                {p.description}
              </p>
              <div style={{ fontFamily:S, fontSize:"0.7rem", color:"var(--text-muted)" }}>
                Applies to: {p.appliesTo}
              </div>
            </div>
          ))}
        </div>

        <div style={{ fontFamily:M, fontSize:"0.68rem", fontWeight:700,
                       color:"var(--text-muted)", letterSpacing:"0.08em", marginBottom:"0.75rem" }}>
          GENERAL UTILITY, NOT VERIFICATION
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>
          {utilityPartners.map(p => (
            <div key={p.name} style={{ padding:"1.125rem", borderRadius:10,
                                          border:`1px solid ${BDR}`, background:"var(--surface-raised)" }}>
              <div style={{ fontFamily:S, fontSize:"0.95rem", fontWeight:700 }}>{p.name}</div>
              <p style={{ fontFamily:S, fontSize:"0.78rem", color:"var(--text-secondary)",
                           lineHeight:1.6, margin:"0.5rem 0 0" }}>
                {p.description}
              </p>
            </div>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
