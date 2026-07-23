"use client";
// FILE: app/tokenomics/page.tsx

import { useEffect, useState } from "react";
import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, KeyValueTable } from "@/components/redesign/RedesignContent";
import { TOKENOMICS } from "@/lib/protocolContent";
import { TOKENOMICS_MODEL } from "@/lib/protocolTokenomicsModel";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export default function TokenomicsPage() {
  const [bags, setBags] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch("/api/bags/revenue")
      .then(r => r.json())
      .then(d => setBags(d.ok ? d : null))
      .catch(() => setBags(null));
  }, []);

  return (
    <RedesignPage maxWidth={820}>
      <PageHeader
        eyebrow="Tokenomics"
        title={`${TOKENOMICS.symbol} utility and economics`}
        subtitle={TOKENOMICS.notRequired}
      />

      <ContentCard title="Live token (today)">
        <KeyValueTable rows={[
          { k: "Symbol", v: TOKENOMICS.symbol },
          { k: "Chain", v: TOKENOMICS.chain },
          { k: "Contract", v: TOKENOMICS.contract, mono: true },
          { k: "Treasury", v: TOKENOMICS.treasury, mono: true },
          { k: "Distribution", v: TOKENOMICS.distribution },
          { k: "Holders", v: TOKENOMICS.holdersNote },
        ]} />
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)", margin: "0.75rem 0 0", lineHeight: 1.65 }}>
          Verification runs on Sui without holding $ABRA. See{" "}
          <Link href="/docs/chain" style={{ color: ACCENT }}>chain architecture</Link> for the intentional split.
        </p>
      </ContentCard>

      {bags?.lifetimeFees != null && (
        <ContentCard title="Live Bags.fm revenue (Solana)">
          <pre style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.68rem", color: "var(--text-secondary)", overflow: "auto", margin: 0 }}>
            {JSON.stringify(bags.lifetimeFees, null, 2)}
          </pre>
        </ContentCard>
      )}

      <ContentCard title="What $ABRA does">
        {TOKENOMICS.utility.map(item => (
          <div key={item.role} style={{ padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%",
                             background: item.active ? ACCENT : "var(--text-muted)" }} />
              <span style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 700,
                              color: "var(--text-primary)" }}>{item.role}</span>
              {!item.active && (
                <span style={{ fontFamily: FONT, fontSize: "0.62rem", color: "var(--text-muted)",
                               border: "1px solid var(--border)", padding: "0.1rem 0.4rem", borderRadius: 6 }}>
                  Planned
                </span>
              )}
            </div>
            <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)",
                         lineHeight: 1.65, margin: 0 }}>{item.desc}</p>
          </div>
        ))}
      </ContentCard>

      <div id="tiers">
        <ContentCard title="Access tiers (live)">
          <KeyValueTable rows={TOKENOMICS.tiers.map(t => ({
            k: t.name, v: `${t.amount} · ${t.benefit}`,
          }))} />
        </ContentCard>
      </div>

      <ContentCard title="Institutional framework (target model)">
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "#F59E0B", margin: "0 0 0.75rem", lineHeight: 1.65 }}>
          {TOKENOMICS_MODEL.disclaimer}
        </p>
        <KeyValueTable rows={[
          { k: "Total supply", v: TOKENOMICS_MODEL.specs.totalSupply },
          { k: "Standard", v: TOKENOMICS_MODEL.specs.standard },
          { k: "Verification chain", v: TOKENOMICS_MODEL.specs.verificationChain },
        ]} />
        <div style={{ marginTop: "1rem" }}>
          {TOKENOMICS_MODEL.allocations.map(a => (
            <div key={a.category} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", padding: "0.5rem 0", borderBottom: "1px solid var(--border)", fontFamily: FONT, fontSize: "0.75rem" }}>
              <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{a.category} ({a.pct})</span>
              <span style={{ color: "var(--text-muted)" }}>{a.cliff} cliff · {a.vest}</span>
            </div>
          ))}
        </div>
      </ContentCard>

      <ContentCard title="VC objections. answered">
        {TOKENOMICS_MODEL.vcDefense.map(row => (
          <div key={row.objection} style={{ marginBottom: "0.75rem" }}>
            <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>{row.objection}</div>
            <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0.25rem 0 0" }}>{row.answer}</p>
          </div>
        ))}
      </ContentCard>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", marginBottom: "2rem" }}>
        <a href="https://bags.fm/$WORLDLABSPROTOCOL-UX" target="_blank" rel="noopener noreferrer"
          style={{ padding: "0.75rem 1.35rem", borderRadius: 999, background: ACCENT, color: "#04130C",
                    fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, textDecoration: "none" }}>
          Buy on Bags.fm →
        </a>
        <Btn href="/docs/litepaper" variant="secondary" size="sm">Litepaper</Btn>
        <Btn href="/investors" variant="ghost" size="sm">Data room</Btn>
      </div>
    </RedesignPage>
  );
}
