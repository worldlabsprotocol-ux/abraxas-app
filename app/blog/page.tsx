import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { BLOG_ARTICLES } from "@/lib/content/blogArticles";
import { BLOG_CATEGORY_LABELS } from "@/lib/content/types";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export default function BlogPage() {
  return (
    <RedesignPage maxWidth={860}>
      <PageHeader eyebrow="Learn" title="Deep dives" subtitle="Real world asset tokenization, RWA infrastructure, asset verification, and the Abraxas proof model for institutional RWA." />
      <ContentCard title="Articles">
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {BLOG_ARTICLES.map(article => (
            <Link key={article.slug} href={`/blog/${article.slug}`} style={{
              display: "block", padding: "0.85rem 1rem", borderRadius: 12,
              border: "1px solid var(--border)", textDecoration: "none", color: "inherit",
            }}>
              <div style={{ fontFamily: FONT, fontSize: "0.58rem", fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.35rem" }}>
                {BLOG_CATEGORY_LABELS[article.category]} · {article.readingTime}
              </div>
              <div style={{ fontFamily: FONT, fontSize: "0.92rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
                {article.title}
              </div>
              <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
                {article.description}
              </p>
            </Link>
          ))}
        </div>
      </ContentCard>
    </RedesignPage>
  );
}
