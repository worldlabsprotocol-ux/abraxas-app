"use client";
// FILE: components/home/HomeSharpHero.tsx
// Hero — headline and primary CTAs.

import { Btn } from "@/components/redesign/ui";
import { useSuiAuthOptional } from "@/components/sui/SuiAuthProvider";
import { useZkLoginSignInChooserOptional } from "@/components/sui/ZkLoginSignInChooserProvider";
import { canOpenSignInChooser } from "@/lib/sui/zklogin/signInChooserState";
import {
  MARKETING_HERO_PILLARS_LINE,
  MARKETING_HERO_SUPPORTING,
  MARKETING_HERO_TAGLINE,
  MARKETING_HERO_TAGLINE_CLOSER,
} from "@/lib/positioningStrategy";
import { ABRAXAS_FONT_DISPLAY, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

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
        padding: "clamp(1.5rem, 5vw, 3rem) 0 clamp(1rem, 3vw, 1.5rem)",
      }}
    >
      <div className="abx-eyebrow-violet" style={{ marginBottom: "0.65rem" }}>
        Reusable identity · eligibility infrastructure
      </div>

      <h1
        id="home-hero-heading"
        style={{
          fontFamily: ABRAXAS_FONT_DISPLAY,
          fontSize: "clamp(2rem, 5.5vw, var(--fs-display))",
          fontWeight: 900,
          letterSpacing: "-0.045em",
          lineHeight: 1.02,
          color: "var(--text-primary)",
          margin: "0 0 0.35rem",
        }}
      >
        {MARKETING_HERO_TAGLINE}
      </h1>

      <p
        style={{
          fontFamily: ABRAXAS_FONT_DISPLAY,
          fontSize: "clamp(1.1rem, 3vw, 1.35rem)",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          color: "var(--accent)",
          margin: "0 0 0.85rem",
        }}
      >
        {MARKETING_HERO_TAGLINE_CLOSER}
      </p>

      <p
        style={{
          fontFamily: FONT,
          fontSize: "clamp(1rem, 2.5vw, 1.15rem)",
          fontWeight: 600,
          color: "var(--text-secondary)",
          margin: "0 auto 0.5rem",
          lineHeight: 1.45,
          maxWidth: 640,
        }}
      >
        {MARKETING_HERO_SUPPORTING}
      </p>
      <p
        style={{
          fontFamily: FONT,
          fontSize: "clamp(0.92rem, 2.2vw, 1.02rem)",
          fontWeight: 700,
          color: "var(--text-primary)",
          margin: "0 auto 1.25rem",
          lineHeight: 1.45,
          maxWidth: 640,
        }}
      >
        {MARKETING_HERO_PILLARS_LINE}
      </p>

      <div className="abx-home-hero-actions">
        {useChooser ? (
          <Btn size="lg" onClick={() => chooser?.openChooser()}>
            Create Passport
          </Btn>
        ) : (
          <Btn href="/passport" size="lg">Create Passport</Btn>
        )}
        <Btn href="/integrate" variant="secondary" size="lg">Build with Abraxas</Btn>
      </div>
    </section>
  );
}
