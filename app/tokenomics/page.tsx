"use client";
// FILE: app/tokenomics/page.tsx

import Link from "next/link";
import { ProtocolPage } from "@/components/ProtocolPage";
import { PageHeader, ContentCard, KeyValueTable } from "@/components/content/ProtocolSection";
import { TOKENOMICS } from "@/lib/protocolContent";

const S = "'Inter',system-ui,-apple-system,sans-serif";
const G = "#10B981";

export default function TokenomicsPage() {
  return (
    <ProtocolPage maxWidth={820}>
      <PageHeader
        eyebrow="Tokenomics"
        title={`${TOKENOMICS.symbol} utility and economics`}
        subtitle={TOKENOMICS.notRequired}
      />

      <ContentCard title="Token details">
        <KeyValueTable rows={[
          { k: "Symbol", v: TOKENOMICS.symbol },
          { k: "Chain", v: TOKENOMICS.chain },
          { k: "Contract", v: TOKENOMICS.contract, mono: true },
          { k: "Treasury", v: TOKENOMICS.treasury, mono: true },
          { k: "Distribution", v: TOKENOMICS.distribution },
          { k: "Holders", v: TOKENOMICS.holdersNote },
        ]} />
      </ContentCard>

      <ContentCard title="What $ABRA does">
        {TOKENOMICS.utility.map(item => (
          <div key={item.role} style={{
            padding: "0.75rem 0",
            borderBottom: "1px solid var(--border)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: item.active ? G : "var(--text-muted)",
              }} />
              <span style={{
                fontFamily: S,
                fontSize: "0.88rem",
                fontWeight: 700,
                color: "var(--text-primary)",
              }}>
                {item.role}
              </span>
              {!item.active && (
                <span style={{
                  fontFamily: S,
                  fontSize: "0.62rem",
                  color: "var(--text-muted)",
                  border: "1px solid var(--border)",
                  padding: "0.1rem 0.4rem",
                  borderRadius: 6,
                }}>
                  Planned
                </span>
              )}
            </div>
            <p style={{
              fontFamily: S,
              fontSize: "0.82rem",
              color: "var(--text-secondary)",
              lineHeight: 1.65,
              margin: 0,
            }}>
              {item.desc}
            </p>
          </div>
        ))}
      </ContentCard>

      <div id="tiers">
        <ContentCard title="Access tiers">
          <KeyValueTable rows={TOKENOMICS.tiers.map(t => ({
            k: t.name,
            v: `${t.amount} · ${t.benefit}`,
          }))} />
        </ContentCard>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem" }}>
        <a href="https://bags.fm/$WORLDLABSPROTOCOL-UX" target="_blank" rel="noopener noreferrer"
          style={{
            padding: "0.75rem 1.35rem",
            borderRadius: 999,
            background: G,
            color: "#000",
            fontFamily: S,
            fontSize: "0.82rem",
            fontWeight: 700,
            textDecoration: "none",
          }}>
          Buy on Bags.fm →
        </a>
        <a href={`https://solscan.io/token/${TOKENOMICS.contract}`} target="_blank" rel="noopener noreferrer"
          style={{
            padding: "0.75rem 1.35rem",
            borderRadius: 999,
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
            fontFamily: S,
            fontSize: "0.82rem",
            fontWeight: 600,
            textDecoration: "none",
          }}>
          View on Solscan →
        </a>
        <Link href="/docs"
          style={{
            padding: "0.75rem 1.35rem",
            borderRadius: 999,
            border: "1px solid var(--border)",
            color: G,
            fontFamily: S,
            fontSize: "0.82rem",
            fontWeight: 600,
            textDecoration: "none",
          }}>
          Read docs →
        </Link>
      </div>
    </ProtocolPage>
  );
}
