import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { MarkdownBody } from "@/components/content/MarkdownBody";
import { ArticleCta } from "@/components/content/ArticleCta";
import { getAllBlogPosts, getBlogPost, getBlogSlugs } from "@/lib/content/blog";
import { BLOG_CATEGORY_LABELS } from "@/lib/content/types";
import { siteUrl } from "@/lib/siteUrl";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export function generateStaticParams() {
  return getBlogSlugs().map(slug => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getBlogPost(params.slug);
  if (!post) return { title: "Article not found" };
  return {
    title: `${post.title} · Abraxas`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      url: siteUrl(`/blog/${post.slug}`),
    },
  };
}

export default function BlogArticlePage({ params }: { params: { slug: string } }) {
  const post = getBlogPost(params.slug);
  if (!post) notFound();

  return (
    <RedesignPage maxWidth={720}>
      <div style={{ paddingBottom: "2.5rem" }}>
        <Link href="/blog" style={{
          fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, color: ACCENT,
          textDecoration: "none", display: "inline-block", marginBottom: "1rem",
        }}>
          ← Learn
        </Link>

        {post.republishNote && (
          <p style={{
            fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)",
            lineHeight: 1.55, margin: "0 0 1rem", padding: "0.65rem 0.75rem",
            borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)",
          }}>
            {post.republishNote}
          </p>
        )}

        <div style={{
          fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700, textTransform: "uppercase",
          color: ACCENT, letterSpacing: "0.1em", marginBottom: "0.5rem",
        }}>
          {BLOG_CATEGORY_LABELS[post.category]}
          {post.readingTime ? ` · ${post.readingTime}` : ""}
          {post.author ? ` · ${post.author}` : ""}
        </div>

        <h1 style={{
          fontFamily: FONT, fontSize: "clamp(1.35rem, 3.5vw, 1.85rem)", fontWeight: 900,
          letterSpacing: "-0.03em", lineHeight: 1.15, color: "var(--text-primary)",
          margin: "0 0 0.65rem",
        }}>
          {post.title}
        </h1>

        <p style={{
          fontFamily: FONT, fontSize: "0.85rem", color: "var(--text-secondary)",
          lineHeight: 1.65, margin: "0 0 1.5rem",
        }}>
          {post.description}
        </p>

        <MarkdownBody markdown={post.body} />
        <ArticleCta />
      </div>
    </RedesignPage>
  );
}
