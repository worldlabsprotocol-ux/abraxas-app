"use client";
// FILE: components/blog/BlogArticleBody.tsx
// Renders blog articles with figure blocks — no duplicate prose for visual sections.

import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import { COSMIC_PALETTE } from "@/lib/demoDesignSystem";
import {
  FEATURED_THESIS_BLOG_SLUG,
  TOP5_PLATFORMS_SLUG,
  type BlogArticle,
  type PlatformReview,
} from "@/lib/content/blogArticles";
import {
  ThesisMarketStatsFigure,
  ThesisQuestionsFigure,
  ThesisStepsFigure,
} from "@/components/blog/RwaThesisFigures";
import { ABRAXAS_FONT_DISPLAY, ABRAXAS_FONT_MONO, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const DISPLAY = ABRAXAS_FONT_DISPLAY;
const MONO = ABRAXAS_FONT_MONO;

const paraStyle: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.92rem",
  color: "var(--text-secondary)",
  lineHeight: 1.8,
  margin: "0 0 1.35rem",
};

function Paragraph({ children }: { children: string }) {
  return <p style={paraStyle}>{children}</p>;
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
          fontFamily: MONO, fontSize: "0.58rem", fontWeight: 800, letterSpacing: "0.12em",
          color: accent, padding: "0.2rem 0.45rem", borderRadius: 6, border: `1px solid ${accent}44`,
        }}>
          #{platform.rank}
        </span>
        <h3 style={{
          fontFamily: DISPLAY, fontSize: "clamp(1.35rem, 3.5vw, 1.85rem)", fontWeight: 900,
          letterSpacing: "-0.04em", lineHeight: 1.05, color: "var(--text-primary)", margin: 0,
        }}>
          {platform.name}
        </h3>
      </div>
      <p style={{ fontFamily: FONT, fontSize: "0.92rem", fontWeight: 700, color: accent, lineHeight: 1.4, margin: "0 0 0.65rem" }}>
        {platform.tagline}
      </p>
      <p style={{ fontFamily: FONT, fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.75, margin: "0 0 0.75rem" }}>
        {platform.body}
      </p>
      <div style={{ fontFamily: MONO, fontSize: "0.55rem", color: "var(--text-muted)", letterSpacing: "0.06em", lineHeight: 1.6 }}>
        <span style={{ color: "var(--text-secondary)", fontWeight: 700 }}>BEST FOR </span>
        {platform.bestFor.join(" · ")}
      </div>
    </article>
  );
}

function PlatformReviewsFigure({ title, platforms }: { title: string; platforms: PlatformReview[] }) {
  return (
    <figure style={{ margin: "1.75rem 0 0.5rem" }}>
      <figcaption style={{
        fontFamily: DISPLAY, fontSize: "clamp(1.4rem, 3.8vw, 2rem)", fontWeight: 900,
        letterSpacing: "-0.04em", color: "var(--text-primary)", margin: "0 0 1rem", lineHeight: 1.1,
      }}>
        {title}
      </figcaption>
      {platforms.map(platform => (
        <PlatformReviewCard key={platform.name} platform={platform} />
      ))}
    </figure>
  );
}

function ThesisArticleContent({ article }: { article: BlogArticle }) {
  const [def, compare, examples, abraxas, blockchain, close] = article.body;

  return (
    <>
      {def && <Paragraph>{def}</Paragraph>}
      <ThesisMarketStatsFigure />
      {compare && <Paragraph>{compare}</Paragraph>}
      <ThesisStepsFigure />
      {examples && <Paragraph>{examples}</Paragraph>}
      <ThesisQuestionsFigure />
      {abraxas && <Paragraph>{abraxas}</Paragraph>}
      {blockchain && <Paragraph>{blockchain}</Paragraph>}
      {close && <Paragraph>{close}</Paragraph>}
    </>
  );
}

function Top5ArticleContent({ article }: { article: BlogArticle }) {
  const intro = article.body.slice(0, -1);
  const close = article.body[article.body.length - 1];

  return (
    <>
      {intro.map((para, i) => (
        <Paragraph key={i}>{para}</Paragraph>
      ))}
      {article.platformReviews && article.platformSectionTitle && (
        <PlatformReviewsFigure title={article.platformSectionTitle} platforms={article.platformReviews} />
      )}
      {close && <Paragraph>{close}</Paragraph>}
    </>
  );
}

function DefaultArticleContent({ article }: { article: BlogArticle }) {
  return (
    <>
      {article.body.map((para, i) => (
        <Paragraph key={i}>{para}</Paragraph>
      ))}
    </>
  );
}

export function BlogArticleBody({
  article,
  showFooter = true,
  compact = false,
}: {
  article: BlogArticle;
  showFooter?: boolean;
  compact?: boolean;
}) {
  const isThesis = article.slug === FEATURED_THESIS_BLOG_SLUG;
  const isTop5 = article.slug === TOP5_PLATFORMS_SLUG;

  return (
    <div className={compact ? undefined : "abx-cosmic-card"} style={{
      padding: compact ? 0 : "clamp(1.25rem, 3vw, 1.75rem)",
      borderRadius: compact ? 0 : 20,
    }}>
      {isThesis ? (
        <ThesisArticleContent article={article} />
      ) : isTop5 ? (
        <Top5ArticleContent article={article} />
      ) : (
        <DefaultArticleContent article={article} />
      )}

      {showFooter && (
        <div style={{
          display: "flex", flexWrap: "wrap", gap: "0.65rem",
          marginTop: "1.5rem", paddingTop: "1.25rem", borderTop: "1px solid var(--border-strong)",
        }}>
          {article.relatedHref && <Btn href={article.relatedHref} size="sm">Integrate</Btn>}
          <Btn href="/verification" variant="secondary" size="sm">Verification layer</Btn>
          {article.mediumUrl && <Btn href={article.mediumUrl} newTab variant="ghost" size="sm">Read on Medium</Btn>}
          <Link href={`/blog/${article.slug}`} style={{
            fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700,
            color: "var(--accent)", alignSelf: "center", textDecoration: "none",
          }}>
            Permalink
          </Link>
        </div>
      )}
    </div>
  );
}
