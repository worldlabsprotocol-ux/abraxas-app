"use client";

import { useState } from "react";
import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import { COSMIC_PALETTE } from "@/lib/demoDesignSystem";
import {
  getHomepageArticles,
  TOP5_PLATFORMS_SLUG,
  type PlatformReview,
} from "@/lib/content/blogArticles";
import { BLOG_CATEGORY_LABELS } from "@/lib/content/types";
import {
  RWA_INSTITUTION_QUESTIONS,
  RWA_THESIS_MARKET_STATS,
  RWA_THESIS_SECTION_INTRO,
  RWA_THESIS_SECTION_NOTE,
  RWA_THESIS_SLUG,
  RWA_THESIS_SUBTITLE,
  RWA_TOKENIZATION_STEPS,
} from "@/lib/rwaTokenizationThesis";
import {
  ABRAXAS_FONT_DISPLAY,
  ABRAXAS_FONT_MONO,
  ABRAXAS_FONT_SANS,
} from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const DISPLAY = ABRAXAS_FONT_DISPLAY;
const MONO = ABRAXAS_FONT_MONO;

function ArticleStats() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, margin: "1.75rem 0" }}>
      {RWA_THESIS_MARKET_STATS.map((s) => (
        <div key={s.label} className="abx-cosmic-card" style={{ padding: "14px 12px", borderRadius: 14, textAlign: "center" }}>
          <div style={{ fontFamily: MONO, fontSize: "0.55rem", color: COSMIC_PALETTE.textMuted, letterSpacing: "0.08em" }}>{s.label}</div>
          <div style={{ fontFamily: FONT, fontSize: "1.35rem", fontWeight: 900, color: COSMIC_PALETTE.gold, margin: "4px 0" }}>{s.value}</div>
          <div style={{ fontFamily: MONO, fontSize: "0.5rem", color: COSMIC_PALETTE.textMuted }}>{s.detail}</div>
        </div>
      ))}
    </div>
  );
}

function ArticleSteps() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8, margin: "1.75rem 0" }}>
      {RWA_TOKENIZATION_STEPS.map((s) => (
        <div key={s.step} style={{ padding: "10px 8px", borderRadius: 12, border: `1px solid ${COSMIC_PALETTE.gold}33`, background: "rgba(0,0,0,0.25)" }}>
          <div style={{ fontFamily: MONO, fontSize: "0.52rem", fontWeight: 800, color: COSMIC_PALETTE.gold }}>{s.step}</div>
          <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 800, color: "var(--text-primary)", marginTop: 4, lineHeight: 1.25 }}>{s.title}</div>
          <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.45 }}>{s.body}</div>
        </div>
      ))}
    </div>
  );
}

function ArticleQuestions() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "1.25rem 0" }}>
      {RWA_INSTITUTION_QUESTIONS.map((q) => (
        <div key={q} style={{
          fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)",
          padding: "10px 14px", borderRadius: 10, borderLeft: `3px solid ${COSMIC_PALETTE.rose}`, background: "rgba(244,114,182,0.06)",
        }}>
          {q}
        </div>
      ))}
    </div>
  );
}

function ArticleLiveProof() {
  return (
    <div className="abx-cosmic-card" style={{
      margin: "1.75rem 0", padding: "1.1rem 1.25rem", borderRadius: 16,
      border: `1px solid ${COSMIC_PALETTE.emerald}44`, background: `linear-gradient(135deg, ${COSMIC_PALETTE.emerald}10, transparent)`,
    }}>
      <div style={{ fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.1em", color: COSMIC_PALETTE.emerald, marginBottom: 8 }}>
        LIVE ON ABRAXAS
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {[
          { name: "Cielo Sunrise", desc: "Hotel · appraised · live bookings", href: "/flagship" },
          { name: "Chickasaw", desc: "270 acre land · verified records", href: "/verify" },
        ].map((r) => (
          <Link key={r.name} href={r.href} style={{
            flex: "1 1 180px", padding: "12px 14px", borderRadius: 12,
            border: `1px solid ${COSMIC_PALETTE.emerald}44`, background: "rgba(0,0,0,0.3)", textDecoration: "none",
          }}>
            <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 800, color: "var(--text-primary)" }}>{r.name}</div>
            <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 4 }}>{r.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function PlatformReviewCard({ platform }: { platform: PlatformReview }) {
  const accent = platform.featured ? COSMIC_PALETTE.gold : "var(--accent-2, var(--accent))";

  return (
    <article
      style={{
        padding: "1.15rem 1.2rem",
        borderRadius: 16,
        marginBottom: "1rem",
        border: platform.featured
          ? `1px solid ${COSMIC_PALETTE.gold}55`
          : "1px solid var(--border-strong)",
        background: platform.featured
          ? "linear-gradient(160deg, rgba(232,197,71,0.08) 0%, rgba(0,0,0,0.25) 100%)"
          : "rgba(0,0,0,0.2)",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.65rem", flexWrap: "wrap", marginBottom: "0.35rem" }}>
        <span style={{
          fontFamily: MONO,
          fontSize: "0.58rem",
          fontWeight: 800,
          letterSpacing: "0.12em",
          color: accent,
          padding: "0.2rem 0.45rem",
          borderRadius: 6,
          border: `1px solid ${accent}44`,
        }}>
          #{platform.rank}
        </span>
        <h3 style={{
          fontFamily: DISPLAY,
          fontSize: "clamp(1.35rem, 3.5vw, 1.85rem)",
          fontWeight: 900,
          letterSpacing: "-0.04em",
          lineHeight: 1.05,
          color: "var(--text-primary)",
          margin: 0,
        }}>
          {platform.name}
        </h3>
      </div>
      <p style={{
        fontFamily: FONT,
        fontSize: "0.92rem",
        fontWeight: 700,
        color: accent,
        lineHeight: 1.4,
        margin: "0 0 0.65rem",
      }}>
        {platform.tagline}
      </p>
      <p style={{
        fontFamily: FONT,
        fontSize: "0.9rem",
        color: "var(--text-secondary)",
        lineHeight: 1.75,
        margin: "0 0 0.75rem",
      }}>
        {platform.body}
      </p>
      <div style={{ fontFamily: MONO, fontSize: "0.55rem", color: "var(--text-muted)", letterSpacing: "0.06em", lineHeight: 1.6 }}>
        <span style={{ color: "var(--text-secondary)", fontWeight: 700 }}>BEST FOR </span>
        {platform.bestFor.join(" · ")}
      </div>
    </article>
  );
}

function PlatformReviewsSection({
  title,
  platforms,
}: {
  title: string;
  platforms: PlatformReview[];
}) {
  return (
    <div style={{ margin: "1.75rem 0 0.5rem" }}>
      <h3 style={{
        fontFamily: DISPLAY,
        fontSize: "clamp(1.4rem, 3.8vw, 2rem)",
        fontWeight: 900,
        letterSpacing: "-0.04em",
        color: "var(--text-primary)",
        margin: "0 0 1rem",
        lineHeight: 1.1,
      }}>
        {title}
      </h3>
      {platforms.map(platform => (
        <PlatformReviewCard key={platform.name} platform={platform} />
      ))}
    </div>
  );
}

const THESIS_VISUALS: Record<number, React.ReactNode> = {
  0: <ArticleStats />,
  2: <ArticleSteps />,
  5: <ArticleQuestions />,
  6: <ArticleLiveProof />,
};

export function HomeFeaturedArticle({ lead = false }: { lead?: boolean }) {
  const articles = getHomepageArticles();
  const [index, setIndex] = useState(0);
  if (!articles.length) return null;

  const article = articles[index];
  const isThesis = article.slug === RWA_THESIS_SLUG;
  const isTop5 = article.slug === TOP5_PLATFORMS_SLUG;
  const platformInsertAt = isTop5 ? 10 : -1;

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

        {isThesis && (
          <>
            <p style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 700, color: "var(--accent-pale, var(--accent))", lineHeight: 1.55, margin: "0 0 0.35rem" }}>
              {RWA_THESIS_SUBTITLE}
            </p>
            <p style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 600, color: "var(--text-secondary)", lineHeight: 1.55, margin: "0 0 0.75rem" }}>
              {RWA_THESIS_SECTION_INTRO}
            </p>
            <p style={{
              fontFamily: FONT, fontSize: "0.84rem", color: "var(--text-muted)", lineHeight: 1.6, margin: "0 0 1.5rem",
              padding: "0.75rem 1rem", borderRadius: 12, border: "1px solid var(--border-strong)", background: "rgba(0,0,0,0.2)",
            }}>
              {RWA_THESIS_SECTION_NOTE}
            </p>
          </>
        )}

        <div className="abx-cosmic-card" style={{ padding: "clamp(1.25rem, 3vw, 1.75rem)", borderRadius: 20 }}>
          {article.body.map((para, i) => (
            <div key={i}>
              <p style={{ fontFamily: FONT, fontSize: "0.92rem", color: "var(--text-secondary)", lineHeight: 1.8, margin: "0 0 1.35rem" }}>
                {para}
              </p>
              {isThesis && THESIS_VISUALS[i]}
              {isTop5 && i === platformInsertAt && article.platformReviews && article.platformSectionTitle && (
                <PlatformReviewsSection
                  title={article.platformSectionTitle}
                  platforms={article.platformReviews}
                />
              )}
            </div>
          ))}

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", marginTop: "1.5rem", paddingTop: "1.25rem", borderTop: "1px solid var(--border-strong)" }}>
            {article.relatedHref && <Btn href={article.relatedHref} size="sm">Integrate</Btn>}
            <Btn href="/verification" variant="secondary" size="sm">Verification layer</Btn>
            {article.mediumUrl && <Btn href={article.mediumUrl} newTab variant="ghost" size="sm">Read on Medium</Btn>}
            <Link href={`/blog/${article.slug}`} style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "var(--accent)", alignSelf: "center", textDecoration: "none" }}>
              Permalink
            </Link>
          </div>
        </div>
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
