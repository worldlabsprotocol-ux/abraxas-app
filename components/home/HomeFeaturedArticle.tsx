"use client";

import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import { COSMIC_PALETTE, DEMO_TYPOGRAPHY } from "@/lib/demoDesignSystem";
import { getFeaturedThesisArticle } from "@/lib/content/blogArticles";
import { BLOG_CATEGORY_LABELS } from "@/lib/content/types";
import {
  RWA_INSTITUTION_QUESTIONS,
  RWA_THESIS_MARKET_STATS,
  RWA_THESIS_SLUG,
  RWA_TOKENIZATION_STEPS,
} from "@/lib/rwaTokenizationThesis";

const FONT = DEMO_TYPOGRAPHY.fontSans;
const MONO = DEMO_TYPOGRAPHY.fontMono;

function ArticleStats() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: 10,
        margin: "1.75rem 0",
      }}
    >
      {RWA_THESIS_MARKET_STATS.map((s) => (
        <div
          key={s.label}
          className="abx-cosmic-card"
          style={{ padding: "14px 12px", borderRadius: 14, textAlign: "center" }}
        >
          <div style={{ fontFamily: MONO, fontSize: "0.55rem", color: COSMIC_PALETTE.textMuted, letterSpacing: "0.08em" }}>
            {s.label}
          </div>
          <div style={{ fontFamily: FONT, fontSize: "1.35rem", fontWeight: 900, color: COSMIC_PALETTE.gold, margin: "4px 0" }}>
            {s.value}
          </div>
          <div style={{ fontFamily: MONO, fontSize: "0.5rem", color: COSMIC_PALETTE.textMuted }}>{s.detail}</div>
        </div>
      ))}
    </div>
  );
}

function ArticleSteps() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
        gap: 8,
        margin: "1.75rem 0",
      }}
    >
      {RWA_TOKENIZATION_STEPS.map((s) => (
        <div
          key={s.step}
          style={{
            padding: "10px 8px",
            borderRadius: 12,
            border: `1px solid ${COSMIC_PALETTE.gold}33`,
            background: "rgba(0,0,0,0.25)",
          }}
        >
          <div style={{ fontFamily: MONO, fontSize: "0.52rem", fontWeight: 800, color: COSMIC_PALETTE.gold }}>{s.step}</div>
          <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 800, color: "var(--text-primary)", marginTop: 4, lineHeight: 1.25 }}>
            {s.title}
          </div>
          <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.45 }}>
            {s.body}
          </div>
        </div>
      ))}
    </div>
  );
}

function ArticleQuestions() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "1.25rem 0" }}>
      {RWA_INSTITUTION_QUESTIONS.map((q) => (
        <div
          key={q}
          style={{
            fontFamily: FONT,
            fontSize: "0.82rem",
            color: "var(--text-secondary)",
            padding: "10px 14px",
            borderRadius: 10,
            borderLeft: `3px solid ${COSMIC_PALETTE.rose}`,
            background: "rgba(244,114,182,0.06)",
          }}
        >
          {q}
        </div>
      ))}
    </div>
  );
}

function ArticleLiveProof() {
  return (
    <div
      className="abx-cosmic-card"
      style={{
        margin: "1.75rem 0",
        padding: "1.1rem 1.25rem",
        borderRadius: 16,
        border: `1px solid ${COSMIC_PALETTE.emerald}44`,
        background: `linear-gradient(135deg, ${COSMIC_PALETTE.emerald}10, transparent)`,
      }}
    >
      <div style={{ fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.1em", color: COSMIC_PALETTE.emerald, marginBottom: 8 }}>
        LIVE ON ABRAXAS
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {[
          { name: "Cielo Sunrise", desc: "Hospitality · appraisal · STR revenue", href: "/case-studies/cielo" },
          { name: "Chickasaw", desc: "270-acre land · diligence verified", href: "/verify" },
        ].map((r) => (
          <Link
            key={r.name}
            href={r.href}
            style={{
              flex: "1 1 180px",
              padding: "12px 14px",
              borderRadius: 12,
              border: `1px solid ${COSMIC_PALETTE.emerald}44`,
              background: "rgba(0,0,0,0.3)",
              textDecoration: "none",
            }}
          >
            <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 800, color: "var(--text-primary)" }}>{r.name}</div>
            <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 4 }}>{r.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Full featured article on homepage — no Medium required to read the thesis. */
export function HomeFeaturedArticle() {
  const article = getFeaturedThesisArticle();
  if (!article) return null;

  const visualsAfter: Record<number, React.ReactNode> = {
    0: <ArticleStats />,
    2: <ArticleSteps />,
    5: <ArticleQuestions />,
    6: <ArticleLiveProof />,
  };

  return (
    <section
      id="article"
      aria-labelledby="article-heading"
      className="abx-home-section"
      style={{
        paddingTop: "clamp(2.5rem, 6vw, 4rem)",
        paddingBottom: "clamp(2.5rem, 6vw, 4rem)",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 clamp(0.5rem, 2vw, 1rem)" }}>
        <div className="abx-eyebrow-violet" style={{ marginBottom: "0.5rem" }}>
          {BLOG_CATEGORY_LABELS[article.category]} · {article.readingTime}
        </div>
        <h2
          id="article-heading"
          style={{
            fontFamily: FONT,
            fontSize: "clamp(1.5rem, 4vw, 2.1rem)",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            color: "var(--text-primary)",
            margin: "0 0 0.65rem",
            lineHeight: 1.12,
          }}
        >
          {article.title}
        </h2>
        <p
          style={{
            fontFamily: FONT,
            fontSize: "1rem",
            fontWeight: 600,
            color: "var(--text-secondary)",
            lineHeight: 1.55,
            margin: "0 0 1.5rem",
          }}
        >
          {article.description}
        </p>

        <article
          className="abx-cosmic-card"
          style={{
            padding: "clamp(1.25rem, 3vw, 1.75rem)",
            borderRadius: 20,
          }}
        >
          {article.body.map((para, i) => (
            <div key={i}>
              <p
                style={{
                  fontFamily: FONT,
                  fontSize: "0.92rem",
                  color: "var(--text-secondary)",
                  lineHeight: 1.8,
                  margin: "0 0 1.35rem",
                }}
              >
                {para}
              </p>
              {visualsAfter[i]}
            </div>
          ))}

          <div
            style={{
              marginTop: "1.5rem",
              padding: "1rem 1.1rem",
              borderRadius: 14,
              border: `1px solid ${COSMIC_PALETTE.emerald}55`,
              background: `linear-gradient(135deg, ${COSMIC_PALETTE.emerald}12, transparent)`,
              textAlign: "center",
            }}
          >
            <div style={{ fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.12em", color: COSMIC_PALETTE.emerald }}>
              VERIFY LAYER
            </div>
            <div style={{ fontFamily: FONT, fontSize: "1.15rem", fontWeight: 900, color: "var(--text-primary)", margin: "6px 0" }}>
              Verify once. Transact everywhere.
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", marginTop: "1.35rem" }}>
            {article.relatedHref && <Btn href={article.relatedHref} size="sm">Integrate →</Btn>}
            <Btn href="/passport" variant="secondary" size="sm">Open passport →</Btn>
            {article.mediumUrl && (
              <Btn href={article.mediumUrl} variant="ghost" size="sm">Also on Medium →</Btn>
            )}
            <Link
              href={`/blog/${RWA_THESIS_SLUG}`}
              style={{
                fontFamily: FONT,
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "var(--accent)",
                alignSelf: "center",
                textDecoration: "none",
              }}
            >
              Permalink →
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
