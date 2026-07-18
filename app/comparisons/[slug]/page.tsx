import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { JsonLdFaq } from "@/components/seo/JsonLd";
import { getComparisonBySlug, COMPARISON_PAGES } from "@/lib/categoryInfrastructure";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

type Props = { params: { slug: string } };

export function generateStaticParams() {
  return COMPARISON_PAGES.map(c => ({ slug: c.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const page = getComparisonBySlug(params.slug);
  if (!page) return {};
  return { title: `${page.title} | Abraxas`, description: page.metaDescription };
}

export default function ComparisonPage({ params }: Props) {
  const page = getComparisonBySlug(params.slug);
  if (!page) notFound();

  return (
    <RedesignPage maxWidth={820}>
      <JsonLdFaq faq={page.faq} />
      <PageHeader eyebrow="Comparison" title={page.title} subtitle={page.thesis} />
      <section style={{ marginBottom: "1.25rem", overflowX: "auto", borderRadius: 12, border: "1px solid var(--border)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
          <thead>
            <tr>
              {["", "Abraxas", page.versus].map(h => (
                <th key={h} style={{ fontFamily: FONT, fontSize: "0.72rem", textAlign: "left", padding: "0.7rem 0.85rem", borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {page.rows.map(row => (
              <tr key={row.dimension}>
                <td style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, padding: "0.7rem 0.85rem", borderBottom: "1px solid var(--border)" }}>{row.dimension}</td>
                <td style={{ fontFamily: FONT, fontSize: "0.76rem", padding: "0.7rem 0.85rem", borderBottom: "1px solid var(--border)", color: "var(--text-secondary)" }}>{row.abraxas}</td>
                <td style={{ fontFamily: FONT, fontSize: "0.76rem", padding: "0.7rem 0.85rem", borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>{row.alternative}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem", marginBottom: "1.5rem" }}>
        <div style={{ padding: "1rem", borderRadius: 12, border: "1px solid rgba(16,185,129,0.28)", background: "rgba(16,185,129,0.06)" }}>
          <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 800, marginBottom: 8 }}>Choose Abraxas when</div>
          <ul style={{ margin: 0, paddingLeft: "1rem", fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
            {page.whenAbraxas.map(w => <li key={w}>{w}</li>)}
          </ul>
        </div>
        <div style={{ padding: "1rem", borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)" }}>
          <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 800, marginBottom: 8 }}>Alternative fits when</div>
          <ul style={{ margin: 0, paddingLeft: "1rem", fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
            {page.whenAlternative.map(w => <li key={w}>{w}</li>)}
          </ul>
        </div>
      </div>
      <Btn href="/developers" size="lg">Build with Abraxas →</Btn>
      <div style={{ marginTop: "1rem" }}>
        <Link href="/comparisons" style={{ fontFamily: FONT, fontSize: "0.76rem", fontWeight: 700, color: "var(--text-muted)", textDecoration: "none" }}>← All comparisons</Link>
      </div>
    </RedesignPage>
  );
}
