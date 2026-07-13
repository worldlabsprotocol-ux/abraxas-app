import type { Metadata } from "next";
import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { getFounderPosts } from "@/lib/content/blog";
import { BLOG_CATEGORY_LABELS } from "@/lib/content/types";
import { Btn } from "@/components/redesign/ui";

export const metadata: Metadata = {
  title: "From the Builder · Abraxas",
  description: "Operator notes, technical deep dives, and narrative conviction pieces from the World Labs team building reusable verification infrastructure.",
};

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export default function FounderBlogPage() {
  const posts = getFounderPosts();

  return (
    <RedesignPage maxWidth={820}>
      <PageHeader
        eyebrow="From the builder"
        title="Operator notes"
        subtitle="Direct updates from the team shipping Abraxas — copy to LinkedIn or X with link back."
      />

      <ContentCard title="How to use these">
        <p style={body}>
          Each post is written for republishing on LinkedIn or X. Lead with one outcome. Three bullets max. One link to the live proof.
        </p>
      </ContentCard>

      <div style={{ display: "grid", gap: "0.85rem", marginBottom: "2rem" }}>
        {posts.map(post => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            style={{
              display: "block", padding: "1rem 1.1rem", borderRadius: 14,
              border: "1px solid var(--border-strong)", background: "var(--surface-raised)",
              textDecoration: "none", color: "inherit",
            }}
          >
            <div style={{ fontFamily: MONO, fontSize: "0.58rem", color: "var(--text-muted)", marginBottom: "0.35rem" }}>
              {post.date}{post.readingTime ? ` · ${post.readingTime}` : ""}
            </div>
            <div style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
              {post.title}
            </div>
            <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
              {post.description}
            </p>
          </Link>
        ))}
      </div>

      <Btn href="/blog" variant="secondary" size="sm">All articles →</Btn>
    </RedesignPage>
  );
}

const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.82rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: 0,
};
