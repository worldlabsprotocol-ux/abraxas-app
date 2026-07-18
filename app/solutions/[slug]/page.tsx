import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { JsonLdFaq } from "@/components/seo/JsonLd";
import { getSolutionBySlug, SOLUTION_PAGES } from "@/lib/categoryInfrastructure";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

type Props = { params: { slug: string } };

export function generateStaticParams() {
  return SOLUTION_PAGES.map(s => ({ slug: s.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const page = getSolutionBySlug(params.slug);
  if (!page) return {};
  return { title: `${page.title} | Abraxas`, description: page.metaDescription };
}

export default function SolutionPage({ params }: Props) {
  const page = getSolutionBySlug(params.slug);
  if (!page) notFound();

  return (
    <RedesignPage maxWidth={820}>
      <PageHeader eyebrow={page.vertical} title={page.title} subtitle={page.problem} />
      <section style={{ marginBottom: "1.25rem", padding: "1.15rem 1.25rem", borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface-raised)" }}>
        <h2 style={{ fontFamily: FONT, fontSize: "var(--fs-h2)", fontWeight: 700, margin: "0 0 0.5rem" }}>How Abraxas fits</h2>
        <p style={{ fontFamily: FONT, fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.75, margin: 0 }}>{page.abraxasFit}</p>
      </section>
      <ul style={{ margin: "0 0 1.5rem", paddingLeft: "1.1rem" }}>
        {page.bullets.map(b => (
          <li key={b} style={{ fontFamily: FONT, fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 8 }}>{b}</li>
        ))}
      </ul>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem", marginBottom: "2rem" }}>
        <Btn href="/developers" size="lg">Build with Abraxas →</Btn>
        {page.proofHref && <Btn href={page.proofHref} variant="secondary" size="lg">See live proof →</Btn>}
        <Link href="/learn/trust-infrastructure" style={{ fontFamily: FONT, fontSize: "0.76rem", fontWeight: 700, color: "var(--accent)", alignSelf: "center", textDecoration: "none" }}>
          What is trust infrastructure? →
        </Link>
      </div>
    </RedesignPage>
  );
}
