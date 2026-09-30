"use client";
// FILE: components/home/HomeSharpHero.tsx
// Hero — one guided demo entry, then clearly grouped secondary paths.

import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_DISPLAY, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import {
  SIMPLIFIED_HOME_CTA_PRIMARY,
  SIMPLIFIED_HOME_CTA_PRIMARY_HREF,
  SIMPLIFIED_HOME_CTA_SECONDARY,
  SIMPLIFIED_HOME_CTA_SECONDARY_HREF,
  SIMPLIFIED_HOME_CTA_SANDBOX,
  SIMPLIFIED_HOME_CTA_SANDBOX_HREF,
  SIMPLIFIED_HOME_EYEBROW,
  SIMPLIFIED_HOME_HEADLINE,
  SIMPLIFIED_HOME_SUBHEAD,
  SIMPLIFIED_HOME_MOBILE_PROMPT,
  SIMPLIFIED_HOME_TRUST_LINE,
  SIMPLIFIED_HERO_FLOW,
} from "@/lib/home/simplifiedHomeCopy";

const FONT = ABRAXAS_FONT_SANS;
const TEAL = "#2DD4BF";
const GOLD = "#E8C547";

const SECONDARY_PATHS = [
  { label: SIMPLIFIED_HOME_CTA_SECONDARY, href: SIMPLIFIED_HOME_CTA_SECONDARY_HREF },
  { label: SIMPLIFIED_HOME_CTA_SANDBOX, href: SIMPLIFIED_HOME_CTA_SANDBOX_HREF },
  { label: "Verification gateway", href: "/verification" },
] as const;

export function HomeSharpHero() {
  return (
    <section
      id="top"
      aria-labelledby="home-hero-heading"
      className="abx-home-hero abx-atmosphere-hero"
      style={{
        padding: "clamp(2rem, 6vw, 4rem) 0 clamp(1.5rem, 4vw, 2.5rem)",
      }}
    >
      <p className="abx-eyebrow-violet" style={{ marginBottom: "0.75rem", letterSpacing: "0.12em" }}>
        {SIMPLIFIED_HOME_EYEBROW}
      </p>

      <h1
        id="home-hero-heading"
        style={{
          fontFamily: ABRAXAS_FONT_DISPLAY,
          fontSize: "clamp(2rem, 5.5vw, var(--fs-display))",
          fontWeight: 900,
          letterSpacing: "-0.045em",
          lineHeight: 1.05,
          color: "var(--text-primary)",
          margin: "0 auto 1rem",
          maxWidth: 720,
        }}
      >
        {SIMPLIFIED_HOME_HEADLINE}
      </h1>

      <p
        style={{
          fontFamily: FONT,
          fontSize: "clamp(1rem, 2.4vw, 1.12rem)",
          fontWeight: 500,
          color: "var(--text-secondary)",
          margin: "0 auto 0.75rem",
          lineHeight: 1.55,
          maxWidth: 560,
        }}
      >
        {SIMPLIFIED_HOME_SUBHEAD}
      </p>
      <p
        className="abx-home-mobile-prompt"
        style={{
          fontFamily: FONT,
          fontSize: "clamp(0.92rem, 2.2vw, 1.02rem)",
          fontWeight: 700,
          color: "var(--text-primary)",
          margin: "0 auto 1.25rem",
          lineHeight: 1.45,
          maxWidth: 520,
        }}
      >
        {SIMPLIFIED_HOME_MOBILE_PROMPT}
      </p>

      <div className="abx-home-hero-actions" style={{ marginBottom: "1rem" }}>
        <Btn href={SIMPLIFIED_HOME_CTA_PRIMARY_HREF} size="lg">
          {SIMPLIFIED_HOME_CTA_PRIMARY} →
        </Btn>
      </div>

      <div
        aria-label="Other Abraxas paths"
        style={{
          width: "min(100%, 620px)",
          margin: "0 auto 1.1rem",
          padding: "0.8rem 0.9rem",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.025)",
        }}
      >
        <p style={{
          fontFamily: FONT,
          fontSize: "0.68rem",
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          margin: "0 0 0.55rem",
        }}>
          Already know where you’re going?
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.45rem 0.9rem" }}>
          {SECONDARY_PATHS.map((path) => (
            <Link
              key={path.href}
              href={path.href}
              style={{
                color: TEAL,
                fontFamily: FONT,
                fontSize: "0.76rem",
                fontWeight: 750,
                textDecoration: "none",
              }}
            >
              {path.label} →
            </Link>
          ))}
        </div>
      </div>

      <Link
        href="/pilot-journey"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          margin: "0 auto 1.5rem",
          padding: "0.42rem 0.75rem",
          borderRadius: 999,
          border: `1px solid ${GOLD}55`,
          background: `${GOLD}10`,
          color: GOLD,
          fontFamily: FONT,
          fontSize: "0.78rem",
          fontWeight: 800,
          textDecoration: "none",
        }}
      >
        See the live privacy journey →
      </Link>

      <div
        aria-label="Passport demo flow"
        className="abx-home-hero-flow"
        style={{
          display: "inline-flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          margin: "0 auto 1.25rem",
          maxWidth: 520,
        }}
      >
        {SIMPLIFIED_HERO_FLOW.map((label, index) => (
          <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
            <span
              style={{
                padding: "0.35rem 0.75rem",
                borderRadius: 999,
                fontFamily: FONT,
                fontSize: "0.78rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                border: `1px solid ${TEAL}44`,
                background: `${TEAL}12`,
              }}
            >
              {label}
            </span>
            {index < SIMPLIFIED_HERO_FLOW.length - 1 && (
              <span aria-hidden="true" style={{ color: GOLD, fontSize: "0.85rem" }}>→</span>
            )}
          </span>
        ))}
      </div>

      <p
        style={{
          fontFamily: FONT,
          fontSize: "0.82rem",
          lineHeight: 1.55,
          color: "var(--text-muted)",
          margin: 0,
          maxWidth: 480,
        }}
      >
        {SIMPLIFIED_HOME_TRUST_LINE}
      </p>
    </section>
  );
}
