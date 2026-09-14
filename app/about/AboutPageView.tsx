"use client";
// FILE: app/about/AboutPageView.tsx

import Link from "next/link";
import Image from "next/image";
import { AbxCard } from "@/components/design/AbxPrimitives";
import { AbxInnerPage } from "@/components/design/AbxInnerPage";
import { Btn } from "@/components/redesign/ui";
import { ABX_FONT_SANS } from "@/lib/design/abraxasDesignSystem";

const FONT = ABX_FONT_SANS;

const SLIDES = [
  { src: "/about/01_cover.png", alt: "Cover. Where assets become collateral" },
  { src: "/about/02_problem.png", alt: "The problem. You own a valuable thing" },
  { src: "/about/03_broken.png", alt: "Why tokenized RWA keeps failing" },
  { src: "/about/04_approach.png", alt: "The Abraxas approach. Verify first" },
  { src: "/about/05_pipeline.png", alt: "The seven step verification pipeline" },
  { src: "/about/06_genesis.png", alt: "Genesis asset. Cielo Sunrise" },
  { src: "/about/07_verticals.png", alt: "Asset verticals including tribal, housing, and royalties" },
  { src: "/about/08_cta.png", alt: "Verification is the trust layer" },
];

export function AboutPageView() {
  return (
    <AbxInnerPage
      accent="home"
      eyebrow="About Abraxas"
      title="Where assets become collateral"
      lead="A visual explainer of how Abraxas helps people and businesses verify once, then reuse trusted proof across participating services."
      align="center"
      maxWidth={920}
      actions={(
        <>
          <Btn href="/passport" size="lg">Open Passport</Btn>
          <Btn href="/about/team" variant="secondary" size="lg">Meet the team</Btn>
        </>
      )}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {SLIDES.map((slide) => (
          <AbxCard key={slide.src} accent="home" padding="0" style={{ overflow: "hidden" }}>
            <Image
              src={slide.src}
              alt={slide.alt}
              width={920}
              height={520}
              style={{ width: "100%", height: "auto", display: "block" }}
              sizes="(max-width: 920px) 100vw, 920px"
            />
          </AbxCard>
        ))}
      </div>

      <AbxCard accent="passport">
        <p style={{ fontFamily: FONT, fontSize: "0.9rem", lineHeight: 1.7, color: "var(--text-secondary)", margin: "0 0 1rem" }}>
          Ready to verify once and reuse your proof? Start with Passport, then explore partner integrations when you are ready.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem" }}>
          <Btn href="/passport">Create your Passport</Btn>
          <Btn href="/integrate" variant="secondary">For businesses</Btn>
          <Link href="/" style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--abx-accent)", alignSelf: "center", textDecoration: "none", fontWeight: 600 }}>
            Return home
          </Link>
        </div>
      </AbxCard>
    </AbxInnerPage>
  );
}
