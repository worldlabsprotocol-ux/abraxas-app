"use client";
// FILE: app/docs/chain/page.tsx

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList, KeyValueTable } from "@/components/redesign/RedesignContent";
import { CHAIN_NARRATIVE } from "@/lib/protocolChain";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export default function ChainPage() {
  const c = CHAIN_NARRATIVE;
  return (
    <RedesignPage maxWidth={820}>
      <PageHeader
        eyebrow="Architecture"
        title={c.headline}
        subtitle={c.summary}
      />

      {c.layers.map(layer => (
        <ContentCard key={layer.chain} title={`${layer.chain}. ${layer.role}`}>
          <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 0.75rem" }}>
            {layer.why}
          </p>
          <BulletList items={layer.live} />
        </ContentCard>
      ))}

      <ContentCard title={c.custody.headline}>
        <KeyValueTable rows={c.custody.rows.map(r => ({
          k: r.item,
          v: `${r.holder} · Abraxas: ${r.abraxas}`,
        }))} />
      </ContentCard>

      <ContentCard title="What we do not claim">
        <BulletList items={c.notClaims} />
      </ContentCard>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", marginBottom: "2rem" }}>
        <Btn href="/docs/architecture" size="lg">Full architecture →</Btn>
        <Btn href="/docs/sui" variant="secondary" size="lg">Sui integration</Btn>
        <Btn href="/tokenomics" variant="ghost" size="lg">Tokenomics</Btn>
      </div>
    </RedesignPage>
  );
}
