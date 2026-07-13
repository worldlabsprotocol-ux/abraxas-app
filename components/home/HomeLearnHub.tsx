"use client";
// FILE: components/home/HomeLearnHub.tsx
// Prominent learn hub strip on homepage — articles visible without hunting.

import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import { FEATURED_LEARN_ARTICLES, LEARN_HUB_LINKS } from "@/lib/content/featuredLearn";
import { BLOG_CATEGORY_LABELS } from "@/lib/content/types";
import { ABRAXAS_PROBLEM_THESIS } from "@/lib/northStar";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export function HomeLearnHub() {
  return (
    <section
      id="learn"
      aria-labelledby="learn-heading"
      style={{
        padding: "clamp(1.5rem, 4vw, 2.5rem) 0",
        borderTop: "1px solid var(--border-strong)",
      }}
    >
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-end",
        flexWrap: "wrap", gap: "1rem", marginBottom: "1rem",
      }}>
        <div style={{ maxWidth: 560 }}>
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
            color: "var(--text-primary)", margin: "0 0 0.5rem",
          }}>
            Understand the problem first
          </h2>
          <p style={{
            fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)",
            lineHeight: 1.65, margin: 0,
          }}>
            {ABRAXAS_PROBLEM_THESIS}
          </p>
        </div>
        <Btn href="/blog" size="lg">Browse learn hub →</Btn>
      </div>

      <div style={{
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
            <p style={{
              fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)",
              lineHeight: 1.55, margin: 0,
            }}>
              {article.description}
            </p>
          </Link>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", alignItems: "center" }}>
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
    </section>
  );
}
