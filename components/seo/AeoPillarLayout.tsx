"use client";
// FILE: components/seo/AeoPillarLayout.tsx
// AEO-optimized pillar page — definition, takeaways, table, FAQ, CTAs.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { Btn } from "@/components/redesign/ui";
import type { PillarPage } from "@/lib/categoryInfrastructure";
import { JsonLdFaq } from "./JsonLd";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export function AeoPillarLayout({ page }: { page: PillarPage }) {
  return (
    <RedesignPage maxWidth={820}>
      <JsonLdFaq faq={page.faq} />
      <article>
        <header style={{ marginBottom: "2rem" }}>
          <div style={{ fontFamily: MONO, fontSize: "0.62rem", fontWeight: 700, color: ACCENT, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
            {page.eyebrow}
          </div>
          <h1 style={{ fontFamily: FONT, fontSize: "var(--fs-h1)", fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 0.75rem", color: "var(--text-primary)" }}>
            {page.title}
          </h1>
          <p style={{ fontFamily: FONT, fontSize: "0.92rem", fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.65, margin: "0 0 0.65rem", maxWidth: 680 }}>
            {page.hook}
          </p>
          <div style={{
            padding: "1rem 1.15rem", borderRadius: 14,
            border: "1px solid rgba(16,185,129,0.28)",
            background: "rgba(16,185,129,0.06)",
            marginBottom: "0.5rem",
          }}>
            <div style={{ fontFamily: MONO, fontSize: "0.5rem", letterSpacing: "0.1em", color: ACCENT, marginBottom: 6 }}>
              ONE-SENTENCE DEFINITION (AEO)
            </div>
            <p style={{ fontFamily: FONT, fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.75, margin: 0 }}>
              {page.aeoAnswer}
            </p>
          </div>
        </header>

        <Section title="Key takeaways">
          <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
            {page.keyTakeaways.map(t => (
              <li key={t} style={{ fontFamily: FONT, fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 8 }}>
                {t}
              </li>
            ))}
          </ul>
        </Section>

        {page.sections.map(s => (
          <Section key={s.heading} title={s.heading}>
            <p style={{ fontFamily: FONT, fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.8, margin: 0 }}>
              {s.body}
            </p>
          </Section>
        ))}

        {page.comparisonTable && page.comparisonTable.length > 0 && (
          <Section title="Comparison">
            <div style={{ overflowX: "auto", borderRadius: 12, border: "1px solid var(--border)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
                <thead>
                  <tr style={{ background: "var(--surface)" }}>
                    {["Dimension", "Abraxas", "Alternative"].map(h => (
                      <th key={h} style={{ fontFamily: MONO, fontSize: "0.52rem", textAlign: "left", padding: "0.7rem 0.85rem", color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {page.comparisonTable.map(row => (
                    <tr key={row.dimension}>
                      <td style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, padding: "0.7rem 0.85rem", borderBottom: "1px solid var(--border)", color: "var(--text-primary)" }}>{row.dimension}</td>
                      <td style={{ fontFamily: FONT, fontSize: "0.76rem", padding: "0.7rem 0.85rem", borderBottom: "1px solid var(--border)", color: "var(--text-secondary)" }}>{row.abraxas}</td>
                      <td style={{ fontFamily: FONT, fontSize: "0.76rem", padding: "0.7rem 0.85rem", borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>{row.alternative}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {page.faq.length > 0 && (
          <Section title="FAQ">
            <div style={{ display: "grid", gap: "0.65rem" }}>
              {page.faq.map(f => (
                <div key={f.q} style={{ padding: "0.85rem 1rem", borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)" }}>
                  <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: 6 }}>{f.q}</div>
                  <div style={{ fontFamily: FONT, fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.65 }}>{f.a}</div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {page.relatedSlugs.length > 0 && (
          <Section title="Related reading">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {page.relatedSlugs.map(slug => (
                <Link key={slug} href={`/learn/${slug}`} style={{ fontFamily: FONT, fontSize: "0.76rem", fontWeight: 700, color: ACCENT, textDecoration: "none" }}>
                  {slug.replace(/-/g, " ")} →
                </Link>
              ))}
            </div>
          </Section>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", marginTop: "1.5rem", marginBottom: "2rem" }}>
          <Btn href={page.primaryCta.href} size="lg">{page.primaryCta.label} →</Btn>
          {page.secondaryCta && (
            <Btn href={page.secondaryCta.href} variant="secondary" size="lg">{page.secondaryCta.label} →</Btn>
          )}
        </div>
      </article>
    </RedesignPage>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "1.35rem", padding: "1.15rem 1.25rem", borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface-raised)" }}>
      <h2 style={{ fontFamily: FONT, fontSize: "var(--fs-h2)", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 0.65rem" }}>{title}</h2>
      {children}
    </section>
  );
}
