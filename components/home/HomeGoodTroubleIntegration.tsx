"use client";
// FILE: components/home/HomeGoodTroubleIntegration.tsx
// Homepage live integration section — Good Trouble customer journey demo.

import { useState } from "react";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_DISPLAY, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { HOME_GOOD_TROUBLE_INTEGRATION } from "@/lib/home/goodTroubleIntegrationDemo";
import { HomePrivacyVideoPlayer } from "@/components/home/HomePrivacyVideoPlayer";

const FONT = ABRAXAS_FONT_SANS;
const DISPLAY = ABRAXAS_FONT_DISPLAY;
const EMERALD = "#10B981";
const TEAL = "#2DD4BF";
const CORAL = "#FB7185";

export function HomeGoodTroubleIntegration() {
  const [videoActive, setVideoActive] = useState(false);
  const copy = HOME_GOOD_TROUBLE_INTEGRATION;

  function watchIntegration() {
    setVideoActive(true);
    const section = document.getElementById(copy.sectionId);
    if (section && typeof section.scrollIntoView === "function") {
      section.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  return (
    <section
      id={copy.sectionId}
      aria-labelledby="home-good-trouble-heading"
      className="abx-home-section abx-home-good-trouble"
      style={{ width: "100%", textAlign: "left" }}
    >
      <div className="abx-home-good-trouble__grid">
        <div className="abx-home-good-trouble__copy">
          <p
            className="abx-eyebrow-violet"
            style={{ marginBottom: "0.65rem", letterSpacing: "0.14em", color: TEAL }}
          >
            {copy.eyebrow}
          </p>

          <h2
            id="home-good-trouble-heading"
            style={{
              fontFamily: DISPLAY,
              fontSize: "clamp(1.35rem, 3.4vw, 2rem)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              lineHeight: 1.12,
              color: "var(--text-primary)",
              margin: "0 0 0.85rem",
              maxWidth: "28rem",
            }}
          >
            {copy.headline}
          </h2>

          <p
            style={{
              fontFamily: FONT,
              fontSize: "clamp(0.88rem, 2.1vw, 1rem)",
              lineHeight: 1.65,
              color: "var(--text-secondary)",
              margin: "0 0 1.15rem",
              maxWidth: "34rem",
            }}
          >
            {copy.body}
          </p>

          <ol
            aria-label="Private eligibility proof sequence"
            style={{
              listStyle: "none",
              margin: "0 0 1.25rem",
              padding: 0,
              display: "grid",
              gap: "0.65rem",
            }}
          >
            {copy.proofSteps.map((item) => (
              <li
                key={item.step}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.7rem",
                  fontFamily: FONT,
                  fontSize: "0.86rem",
                  lineHeight: 1.5,
                  color: "var(--text-primary)",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    flex: "0 0 auto",
                    width: 28,
                    height: 28,
                    borderRadius: 999,
                    display: "grid",
                    placeItems: "center",
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    color: "#041016",
                    background: `linear-gradient(135deg, ${EMERALD}, ${TEAL})`,
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  {item.step}
                </span>
                <span style={{ paddingTop: "0.2rem" }}>{item.label}</span>
              </li>
            ))}
          </ol>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.65rem",
              alignItems: "center",
            }}
          >
            <Btn onClick={watchIntegration} ariaLabel={copy.primaryCta}>
              {copy.primaryCta}
            </Btn>
            <Btn href={copy.secondaryHref} variant="secondary" ariaLabel={copy.secondaryCta}>
              {copy.secondaryCta}
            </Btn>
          </div>
        </div>

        <div
          className="abx-home-good-trouble__media"
          style={{
            position: "relative",
            padding: "1rem",
            borderRadius: 22,
            background:
              "linear-gradient(145deg, rgba(16,185,129,0.08), rgba(45,212,191,0.05) 45%, rgba(251,113,133,0.08))",
            border: "1px solid rgba(45, 212, 191, 0.18)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: "12% 8% auto auto",
              width: 120,
              height: 120,
              borderRadius: 999,
              background: `radial-gradient(circle, ${CORAL}22 0%, transparent 70%)`,
              pointerEvents: "none",
            }}
          />
          <HomePrivacyVideoPlayer
            title={copy.videoTitle}
            active={videoActive}
            onActivate={() => setVideoActive(true)}
          />
          <p
            style={{
              margin: "0.75rem 0 0",
              fontFamily: FONT,
              fontSize: "0.72rem",
              lineHeight: 1.5,
              color: "var(--text-muted)",
              textAlign: "center",
            }}
          >
            Good Trouble pilot integration. Abraxas remains the verification layer.
          </p>
        </div>
      </div>

      <style jsx>{`
        .abx-home-good-trouble__grid {
          display: grid;
          gap: clamp(1.25rem, 3vw, 2rem);
          align-items: center;
          width: 100%;
        }
        @media (min-width: 900px) {
          .abx-home-good-trouble__grid {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
            gap: clamp(1.5rem, 4vw, 2.5rem);
          }
        }
        @media (max-width: 899px) {
          .abx-home-good-trouble {
            text-align: center;
          }
          .abx-home-good-trouble__copy ol {
            text-align: left;
            max-width: 360px;
            margin-left: auto;
            margin-right: auto;
          }
          .abx-home-good-trouble__copy > div:last-child {
            justify-content: center;
          }
        }
      `}</style>
    </section>
  );
}
