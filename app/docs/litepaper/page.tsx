"use client";
// FILE: app/docs/litepaper/page.tsx

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";
import { LITEPAPER } from "@/lib/protocolLitepaper";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export default function LitepaperPage() {
  const lp = LITEPAPER;
  return (
    <RedesignPage maxWidth={820}>
      <PageHeader
        eyebrow={`Litepaper v${lp.version}`}
        title={lp.title}
        subtitle={lp.tagline}
      />

      <ContentCard title={lp.problem.headline}>
        <p style={bodyStyle}>{lp.problem.body}</p>
        <BulletList items={lp.problem.bullets} />
      </ContentCard>

      <ContentCard title={lp.solution.headline}>
        <p style={bodyStyle}>{lp.solution.body}</p>
        {lp.solution.layers.map(l => (
          <div key={l.name} style={{ padding: "0.65rem 0", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>{l.name}</div>
            <p style={{ ...bodyStyle, margin: "0.25rem 0 0" }}>{l.desc}</p>
          </div>
        ))}
      </ContentCard>

      <ContentCard title={lp.moat.headline}>
        <BulletList items={lp.moat.points} />
      </ContentCard>

      <ContentCard title={lp.proof.headline}>
        {lp.proof.items.map(item => (
          <Link key={item.label} href={item.href} style={{
            display: "block", padding: "0.65rem 0", borderBottom: "1px solid var(--border)",
            textDecoration: "none",
          }}>
            <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: ACCENT }}>{item.label}</div>
            <div style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: 2 }}>{item.value}</div>
          </Link>
        ))}
      </ContentCard>

      <ContentCard title={lp.economics.headline}>
        {lp.economics.streams.map(s => (
          <div key={s.name} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0.5rem", padding: "0.55rem 0", borderBottom: "1px solid var(--border)" }}>
            <div>
              <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>{s.name}</div>
              <div style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)" }}>{s.desc}</div>
            </div>
            <span style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700, color: s.status === "Live" ? ACCENT : "#F59E0B", alignSelf: "start" }}>{s.status}</span>
          </div>
        ))}
      </ContentCard>

      <ContentCard title={lp.decentralization.headline}>
        {lp.decentralization.phases.map(p => (
          <div key={p.phase} style={{ marginBottom: "0.75rem" }}>
            <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>{p.phase}</div>
            <p style={{ ...bodyStyle, margin: "0.25rem 0 0" }}>{p.desc}</p>
          </div>
        ))}
      </ContentCard>

      <ContentCard title="Brand hierarchy">
        {lp.brand.hierarchy.map(b => (
          <div key={b.name} style={{ display: "flex", gap: "0.75rem", padding: "0.4rem 0" }}>
            <span style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, color: ACCENT, minWidth: 160 }}>{b.name}</span>
            <span style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)" }}>{b.role}</span>
          </div>
        ))}
      </ContentCard>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", marginBottom: "2rem" }}>
        <Btn href="/docs" size="lg">Full documentation →</Btn>
        <Btn href="/docs/chain" variant="secondary" size="lg">Chain architecture</Btn>
        <Btn href="/docs/ail" variant="ghost" size="lg">Technical spec (AIL)</Btn>
      </div>
    </RedesignPage>
  );
}

const bodyStyle: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.86rem",
  color: "var(--text-secondary)",
  lineHeight: 1.75,
  margin: "0 0 0.75rem",
};
