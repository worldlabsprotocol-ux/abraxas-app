"use client";
// FILE: components/home/HomeSharpHero.tsx
// Hero — headline, CTAs, and verify-once flow visual.

import { Btn } from "@/components/redesign/ui";
import { useSuiAuthOptional } from "@/components/sui/SuiAuthProvider";
import { useZkLoginSignInChooserOptional } from "@/components/sui/ZkLoginSignInChooserProvider";
import { canOpenSignInChooser } from "@/lib/sui/zklogin/signInChooserState";
import { ABRAXAS_FONT_DISPLAY, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import {
  SIMPLIFIED_HOME_CTA_PRIMARY,
  SIMPLIFIED_HOME_CTA_PRIMARY_HREF,
  SIMPLIFIED_HOME_CTA_SECONDARY,
  SIMPLIFIED_HOME_CTA_SECONDARY_HREF,
  SIMPLIFIED_HOME_EYEBROW,
  SIMPLIFIED_HOME_HEADLINE,
  SIMPLIFIED_HOME_SUBHEAD,
  SIMPLIFIED_HOME_TRUST_LINE,
  SIMPLIFIED_HERO_FLOW,
} from "@/lib/home/simplifiedHomeCopy";

const FONT = ABRAXAS_FONT_SANS;
const TEAL = "#2DD4BF";
const GOLD = "#E8C547";

export function HomeSharpHero() {
  const auth = useSuiAuthOptional();
  const chooser = useZkLoginSignInChooserOptional();
  const signedIn = Boolean(auth?.suiAddress);
  const useChooser = !signedIn && canOpenSignInChooser({ configured: auth?.isConfigured ?? false });

  return (
    <section
      id="top"
      aria-labelledby="home-hero-heading"
      className="abx-home-hero"
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
          margin: "0 auto 1.5rem",
          lineHeight: 1.55,
          maxWidth: 560,
        }}
      >
        {SIMPLIFIED_HOME_SUBHEAD}
      </p>

      <div className="abx-home-hero-actions" style={{ marginBottom: "1.5rem" }}>
        {useChooser ? (
          <Btn size="lg" onClick={() => chooser?.openChooser()}>
            {SIMPLIFIED_HOME_CTA_PRIMARY}
          </Btn>
        ) : (
          <Btn href={SIMPLIFIED_HOME_CTA_PRIMARY_HREF} size="lg">
            {SIMPLIFIED_HOME_CTA_PRIMARY}
          </Btn>
        )}
        <Btn href={SIMPLIFIED_HOME_CTA_SECONDARY_HREF} variant="secondary" size="lg">
          {SIMPLIFIED_HOME_CTA_SECONDARY}
        </Btn>
      </div>

      <div
        aria-label="Verify once flow"
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
