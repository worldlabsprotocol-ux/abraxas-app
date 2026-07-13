import type { Metadata } from "next";
import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader } from "@/components/redesign/RedesignContent";
import { BlogHub } from "@/components/content/BlogHub";
import { getAllBlogPosts } from "@/lib/content/blog";
import { ABRAXAS_PROBLEM_THESIS, ABRAXAS_TAGLINE } from "@/lib/messaging/bible";
import { Btn } from "@/components/redesign/ui";

export const metadata: Metadata = {
  title: "Learn — Abraxas",
  description: "Educational content on reusable verification, RWAs, and why tokenization alone is not enough. Verify once. Transact everywhere.",
  openGraph: {
    title: "Learn · Abraxas",
    description: ABRAXAS_PROBLEM_THESIS,
    type: "website",
  },
};

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export default function BlogIndexPage() {
  const posts = getAllBlogPosts().filter(p => p.category !== "template");

  return (
    <RedesignPage maxWidth={820}>
      <PageHeader
        eyebrow="Learn"
        title="Verification infrastructure — explained"
        subtitle={`${ABRAXAS_TAGLINE} Educational articles on the problem, the proof, and how to integrate.`}
      />

      <div style={{
        marginBottom: "1.25rem", padding: "0.85rem 1rem", borderRadius: 12,
        border: "1px solid var(--border)", background: "var(--surface)",
      }}>
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 0.65rem" }}>
          {ABRAXAS_PROBLEM_THESIS}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <Btn href="/case-studies/cielo" size="sm" variant="secondary">Cielo proof →</Btn>
          <Btn href="/blog/founder" size="sm" variant="ghost">From the builder →</Btn>
        </div>
      </div>

      <BlogHub posts={posts} />

      <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "1.5rem", lineHeight: 1.6 }}>
        Articles are republishable on Medium with canonical link to this site.{" "}
        <Link href="/community" style={{ color: "#10B981", fontWeight: 600 }}>Community →</Link>
      </p>
    </RedesignPage>
  );
}
