// FILE: app/about/page.tsx
// Public explainer page. uses the IG carousel slides as scrollable sections.
// Shareable URL for newcomers, lifts the IG content into the web product.
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "About Abraxas",
  description: "Where assets become collateral. A plain-English explainer of Abraxas Protocol. the verification and collateral intelligence OS for real-world assets.",
};

const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const S = "system-ui,-apple-system,sans-serif";

const SLIDES = [
  { src: "/about/01_cover.png",      alt: "Cover. Where assets become collateral" },
  { src: "/about/02_problem.png",    alt: "The problem. you own a valuable thing" },
  { src: "/about/03_broken.png",     alt: "Why tokenized RWA keeps failing" },
  { src: "/about/04_approach.png",   alt: "The Abraxas approach. verify first" },
  { src: "/about/05_pipeline.png",   alt: "The 7-step verification pipeline" },
  { src: "/about/06_genesis.png",    alt: "Genesis Asset. Cielo Sunrise" },
  { src: "/about/07_verticals.png",  alt: "Asset verticals. tribal, housing, royalties" },
  { src: "/about/08_cta.png",        alt: "Verification is the trust layer" },
];

export default function AboutPage() {
  return (
    <div style={{ background: "#040608", minHeight: "100vh",
                   color: "#F8FAFC", fontFamily: S }}>

      {/* Status strip */}
      <div style={{ background: "#020406", borderBottom: "1px solid #0F1929",
                     padding: "0 clamp(0.75rem,2.5vw,1.5rem)",
                     height: 28, display: "flex", alignItems: "center",
                     gap: "1rem", overflowX: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%",
                         background: "#10B981",
                         boxShadow: "0 0 5px rgba(16,185,129,0.8)" }}/>
          <span style={{ fontFamily: M, fontSize: "0.65rem", fontWeight: 700,
                          color: "rgba(255,255,255,0.3)",
                          letterSpacing: "0.12em",
                          textTransform: "uppercase" }}>
            ABRAXAS · ABOUT
          </span>
        </div>
        <div style={{ flex: 1 }}/>
        <Link href="/" style={{ fontFamily: M, fontSize: "0.7rem",
                                          color: "#10B981", textDecoration: "none",
                                          letterSpacing: "0.1em",
                                          textTransform: "uppercase" }}>
          OPEN APP →
        </Link>
        <Link href="/about/team" style={{ fontFamily: M, fontSize: "0.7rem",
                                          color: "rgba(255,255,255,0.4)", textDecoration: "none",
                                          letterSpacing: "0.1em",
                                          textTransform: "uppercase" }}>
          TEAM →
        </Link>
      </div>

      {/* Header */}
      <div style={{ padding: "3rem clamp(1rem,3vw,2rem) 1rem",
                     textAlign: "center", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ fontFamily: M, fontSize: "0.8rem", fontWeight: 700,
                       color: "rgba(16,185,129,0.7)",
                       textTransform: "uppercase", letterSpacing: "0.25em",
                       marginBottom: "1rem" }}>
          ABRAXAS PROTOCOL · INSTITUTIONAL EXPLAINER
        </div>
        <h1 style={{ fontFamily: "Georgia, serif",
                      fontSize: "clamp(2rem, 6vw, 4rem)",
                      fontWeight: 800, color: "#F8FAFC",
                      margin: "0 0 0.75rem", letterSpacing: "-0.02em",
                      lineHeight: 1.1 }}>
          Where assets<br/>
          <span style={{ color: "#10B981" }}>become collateral.</span>
        </h1>
        <p style={{ fontFamily: S, fontSize: "clamp(0.9rem,1.8vw,1.1rem)",
                     color: "rgba(255,255,255,0.5)", lineHeight: 1.75,
                     margin: "1rem auto", maxWidth: 620 }}>
          Plain-English explainer of how Abraxas verifies real-world assets
          before they become programmable collateral on Sui. Eight sections.
          Scroll or swipe.
        </p>
      </div>

      {/* Slides. vertical scroll layout */}
      <div style={{ maxWidth: 700, margin: "0 auto",
                     padding: "1rem clamp(1rem,3vw,2rem) 3rem",
                     display: "flex", flexDirection: "column",
                     gap: "1.5rem" }}>
        {SLIDES.map((slide, i) => (
          <div key={slide.src} style={{
            borderRadius: 12, overflow: "hidden",
            border: "1px solid #1C2333",
            boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
            position: "relative",
            aspectRatio: "1 / 1",
          }}>
            <Image
              src={slide.src}
              alt={slide.alt}
              width={1080}
              height={1080}
              priority={i < 2}
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </div>
        ))}
      </div>

      {/* Footer CTAs */}
      <div style={{ borderTop: "1px solid #1C2333",
                     padding: "3rem clamp(1rem,3vw,2rem)",
                     background: "#070A0F",
                     textAlign: "center" }}>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap",
                       justifyContent: "center", marginBottom: "2rem" }}>
          <Link href="/" style={{
            padding: "0.75rem 1.5rem", borderRadius: 5,
            background: "#10B981", color: "#000",
            fontFamily: M, fontSize: "1rem", fontWeight: 900,
            textDecoration: "none", letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}>
            OPEN APP →
          </Link>
          <Link href="/about/team" style={{
            padding: "0.75rem 1.5rem", borderRadius: 5,
            border: "1px solid rgba(16,185,129,0.4)",
            background: "rgba(16,185,129,0.08)",
            color: "#10B981", fontFamily: M, fontSize: "1rem", fontWeight: 700,
            textDecoration: "none", letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}>
            TEAM & EXECUTION →
          </Link>
          <Link href="/investors/strategy" style={{
            padding: "0.75rem 1.5rem", borderRadius: 5,
            border: "1px solid rgba(59,130,246,0.4)",
            background: "rgba(59,130,246,0.08)",
            color: "#3B82F6", fontFamily: M, fontSize: "1rem", fontWeight: 700,
            textDecoration: "none", letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}>
            STRATEGIC ROADMAP →
          </Link>
        </div>
        <div style={{ fontFamily: M, fontSize: "0.75rem",
                       color: "rgba(255,255,255,0.3)",
                       letterSpacing: "0.15em",
                       textTransform: "uppercase" }}>
          @abraxasxyz · @pabloretroworld · abraxas-app.vercel.app · $ABRA
        </div>
      </div>
    </div>
  );
}
