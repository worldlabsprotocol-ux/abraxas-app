"use client";
// FILE: components/home/HomeLearnHub.tsx
// Learn hub — trimmed on mobile (Becker: click within seconds).

import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import { FEATURED_LEARN_ARTICLES, LEARN_HUB_LINKS } from "@/lib/content/featuredLearn";
import { BLOG_CATEGORY_LABELS } from "@/lib/content/types";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export function HomeLearnHub() {
  const featured = FEATURED_LEARN_ARTICLES[0];

  return (
    <section
      id="learn"
      aria-labelledby="learn-heading"
      className="home-learn-hub"
      style={{
        padding: "clamp(1.25rem, 3vw, 2rem) 0",
        borderTop: "1px solid var(--border-strong)",
      }}
    >
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-end",
        flexWrap: "wrap", gap: "1rem", marginBottom: "1rem",
      }}>
        <div style={{ maxWidth: 480 }}>
          <div style={{
            fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700,
            letterSpacing: "0.12em", textTransform: "uppercase",
            color: ACCENT, marginBottom: "0.45rem",
          }}>
            Learn
          </div>
          <h2 id="learn-heading" style={{
            fontFamily: FONT, fontSize: "var(--fs-h2)", fontWeight: 800,
            letterSpacing: "-0.02em", lineHeight: 1.1,
            color: "var(--text-primary)", margin: "0 0 0.35rem",
          }}>
            Why reusable trust matters
          </h2>
          <p className="learn-thesis" style={{
            fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)",
            lineHeight: 1.65, margin: 0,
          }}>
            Repeated verification is the hidden tax on every deal. Abraxas removes it.
          </p>
        </div>
        <Btn href="/blog" size="lg">Learn hub →</Btn>
      </div>

      {featured && (
        <Link
          href={`/blog/${featured.slug}`}
          className="learn-featured-mobile"
          style={{
            display: "none", padding: "1rem", borderRadius: 14,
            border: "1px solid var(--border-strong)", background: "var(--surface-raised)",
            textDecoration: "none", color: "inherit", marginBottom: "0.75rem",
          }}
        >
          <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, color: "var(--text-primary)" }}>
            {featured.title} →
          </div>
        </Link>
      )}

      <div className="learn-articles-full" style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
        gap: "0.75rem",
        marginBottom: "1rem",
      }}>
        {FEATURED_LEARN_ARTICLES.map(article => (
          <Link
            key={article.slug}
            href={`/blog/${article.slug}`}
            style={{
              display: "block", padding: "1rem 1.05rem", borderRadius: 14,
              border: "1px solid var(--border-strong)", background: "var(--surface-raised)",
              textDecoration: "none", color: "inherit",
            }}
          >
            <div style={{
              fontFamily: MONO, fontSize: "0.52rem", fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.08em",
              color: ACCENT, marginBottom: "0.35rem",
            }}>
              {BLOG_CATEGORY_LABELS[article.category]} · {article.readingTime}
            </div>
            <div style={{
              fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800,
              color: "var(--text-primary)", lineHeight: 1.3, marginBottom: "0.35rem",
            }}>
              {article.title}
            </div>
            <p className="learn-article-desc" style={{
              fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)",
              lineHeight: 1.55, margin: 0,
            }}>
              {article.description}
            </p>
          </Link>
        ))}
      </div>

      <div className="learn-links-row" style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", alignItems: "center" }}>
        {LEARN_HUB_LINKS.map(link => (
          <Link
            key={link.href}
            href={link.href}
            style={{
              fontFamily: FONT, fontSize: "0.76rem", fontWeight: 700,
              color: ACCENT, textDecoration: "none",
            }}
          >
            {link.label} →
          </Link>
        ))}
      </div>

      <style jsx>{`
        @media (max-width: 640px) {
          .home-learn-hub :global(.learn-thesis) {
            display: none;
          }
          .home-learn-hub :global(.learn-articles-full) {
            display: none;
          }
          .home-learn-hub :global(.learn-links-row) {
            display: none;
          }
          .home-learn-hub :global(.learn-featured-mobile) {
            display: block !important;
          }
        }
      `}</style>
    </section>
  );
}
