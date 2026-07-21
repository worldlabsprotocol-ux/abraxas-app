// FILE: app/blog/[slug]/page.tsx

import Link from "next/link";
import { notFound } from "next/navigation";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { getBlogArticle } from "@/lib/content/blogArticles";
import { BLOG_CATEGORY_LABELS } from "@/lib/content/types";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getBlogArticle(slug);
  if (!article) notFound();

  return (
    <RedesignPage maxWidth={720}>
      <PageHeader
        eyebrow={`${BLOG_CATEGORY_LABELS[article.category]} · ${article.readingTime}`}
        title={article.title}
        subtitle={article.description}
      />
      <ContentCard title="">
        {article.body.map((para, i) => (
          <p key={i} style={{ fontFamily: FONT, fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.75, margin: "0 0 1rem" }}>
            {para}
          </p>
        ))}
        {article.relatedHref && (
          <Btn href={article.relatedHref} size="sm">Continue reading →</Btn>
        )}
        {article.mediumUrl && (
          <div style={{ marginTop: "0.85rem" }}>
            <Btn href={article.mediumUrl} variant="secondary" size="sm">
              Read on Medium →
            </Btn>
          </div>
        )}
        <div style={{ marginTop: "1.25rem" }}>
          <Link href="/blog" style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}>
            ← All articles
          </Link>
        </div>
      </ContentCard>
    </RedesignPage>
  );
}
