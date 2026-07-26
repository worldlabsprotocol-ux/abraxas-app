"use client";

import { useState } from "react";
import { getHomepageArticles } from "@/lib/content/blogArticles";
import { BLOG_CATEGORY_LABELS } from "@/lib/content/types";
import { BlogArticleBody } from "@/components/blog/BlogArticleBody";
import { ABRAXAS_FONT_DISPLAY, ABRAXAS_FONT_MONO, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const DISPLAY = ABRAXAS_FONT_DISPLAY;
const MONO = ABRAXAS_FONT_MONO;

export function HomeFeaturedArticle({ lead = false }: { lead?: boolean }) {
  const articles = getHomepageArticles();
  const [index, setIndex] = useState(0);
  if (!articles.length) return null;

  const article = articles[index];

  function prev() {
    setIndex(i => (i - 1 + articles.length) % articles.length);
  }
  function next() {
    setIndex(i => (i + 1) % articles.length);
  }

  return (
    <section
      id="article"
      aria-labelledby="article-heading"
      className="abx-home-section"
      style={{
        paddingTop: lead ? "clamp(1.25rem, 3vw, 2rem)" : "clamp(2.5rem, 6vw, 4rem)",
        paddingBottom: lead ? "clamp(2rem, 5vw, 3rem)" : "clamp(2.5rem, 6vw, 4rem)",
        borderBottom: lead ? "1px solid var(--border-strong)" : undefined,
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 clamp(0.5rem, 2vw, 1rem)" }}>
        {lead && (
          <div className="abx-eyebrow-violet" style={{ marginBottom: "0.65rem" }}>
            New here? Start here
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
          <div className="abx-eyebrow-violet">
            {lead ? "What we are building" : `Insights · ${index + 1} of ${articles.length}`}
          </div>
          <div style={{ display: "flex", gap: "0.35rem" }}>
            <button type="button" onClick={prev} aria-label="Previous article" style={navBtnStyle}>←</button>
            <button type="button" onClick={next} aria-label="Next article" style={navBtnStyle}>→</button>
          </div>
        </div>

        <div style={{ fontFamily: MONO, fontSize: "0.58rem", color: "var(--text-muted)", marginBottom: "0.35rem" }}>
          {BLOG_CATEGORY_LABELS[article.category]} · {article.readingTime}
        </div>
        <h2 id="article-heading" style={{
          fontFamily: DISPLAY, fontSize: "clamp(1.5rem, 4vw, 2.1rem)", fontWeight: 900,
          letterSpacing: "-0.04em", color: "var(--text-primary)", margin: "0 0 0.65rem", lineHeight: 1.12,
        }}>
          {article.title}
        </h2>
        <p style={{ fontFamily: FONT, fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 1.25rem" }}>
          {article.description}
        </p>

        <BlogArticleBody article={article} />
      </div>
    </section>
  );
}

const navBtnStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 999,
  border: "1px solid var(--border)",
  background: "var(--surface-raised)",
  color: "var(--text-secondary)",
  fontFamily: ABRAXAS_FONT_SANS,
  fontSize: "0.9rem",
  cursor: "pointer",
};
