"use client";
// FILE: components/home/HomeGoodTroubleIntegration.tsx
// Homepage production demo — scroll-narrated private eligibility sequence.

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_DISPLAY, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { HOME_GOOD_TROUBLE_INTEGRATION } from "@/lib/home/goodTroubleIntegrationDemo";
import { HomeGoodTroubleProductionDemoVideo } from "@/components/home/HomeGoodTroubleProductionDemoVideo";
import { useCinematicNarrativeProgress } from "@/lib/motion/cinematic/useCinematicNarrativeProgress";
import { abxMotionTransition } from "@/lib/motion/abxMotionFramer";

const FONT = ABRAXAS_FONT_SANS;
const DISPLAY = ABRAXAS_FONT_DISPLAY;
const EMERALD = "#10B981";
const TEAL = "#2DD4BF";
const CORAL = "#FB7185";

export function HomeGoodTroubleIntegration() {
  const [videoActive, setVideoActive] = useState(false);
  const copy = HOME_GOOD_TROUBLE_INTEGRATION;
  const reduce = useReducedMotion();
  const { ref, progress: effective, isStatic } = useCinematicNarrativeProgress(130);

  function watchProductionDemo() {
    setVideoActive(true);
    const section = document.getElementById(copy.sectionId);
    if (section && typeof section.scrollIntoView === "function") {
      section.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  const narrativeActive = !videoActive && !isStatic;

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      id={copy.sectionId}
      aria-labelledby="home-good-trouble-heading"
      className={`abx-home-section abx-home-good-trouble abx-home-good-trouble--narrative ${videoActive ? "abx-home-good-trouble--video-focus" : ""}`}
      style={{ width: "100%", textAlign: "left" }}
      data-scroll-progress={effective.toFixed(2)}
    >
      <div className="abx-home-good-trouble__sticky">
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
              className={`abx-home-good-trouble__sequence ${videoActive ? "abx-home-good-trouble__sequence--settled" : ""}`}
            >
              {copy.proofSteps.map((item, index) => {
                const stepActive = !narrativeActive || effective >= index / copy.proofSteps.length;
                const stepCurrent =
                  narrativeActive
                  && effective >= index / copy.proofSteps.length
                  && effective < (index + 1) / copy.proofSteps.length;
                return (
                  <motion.li
                    key={item.step}
                    className={`abx-home-good-trouble__sequence-step ${stepCurrent ? "abx-home-good-trouble__sequence-step--current" : ""} ${stepActive ? "abx-home-good-trouble__sequence-step--done" : ""}`}
                    animate={
                      reduce || videoActive
                        ? undefined
                        : {
                            opacity: stepActive ? 1 : 0.45,
                            x: stepActive ? 0 : -6,
                          }
                    }
                    transition={abxMotionTransition("surface", { tier: "cinematic" })}
                  >
                    <span className="abx-home-good-trouble__sequence-index" aria-hidden="true">
                      {item.step}
                    </span>
                    <span className="abx-home-good-trouble__sequence-label">{item.label}</span>
                  </motion.li>
                );
              })}
            </ol>

            <div className="abx-home-good-trouble__narrowing" aria-hidden="true">
              <span className={`abx-home-good-trouble__narrow-chip ${!narrativeActive || effective > 0.35 ? "is-redacted" : ""}`}>
                Date of birth
              </span>
              <span className="abx-home-good-trouble__narrow-arrow">→</span>
              <span className={`abx-home-good-trouble__narrow-chip ${!narrativeActive || effective > 0.55 ? "is-resolved" : ""}`}>
                21+
              </span>
            </div>

            <div className="abx-home-good-trouble__actions">
              <Btn href={copy.secondaryHref} ariaLabel={copy.primaryCta}>
                {copy.primaryCta}
              </Btn>
              <Btn onClick={watchProductionDemo} variant="secondary" ariaLabel={copy.secondaryCta}>
                {copy.secondaryCta}
              </Btn>
            </div>
          </div>

          <div className="abx-home-good-trouble__media">
            <div className="abx-home-good-trouble__media-glow" aria-hidden="true" />
            <HomeGoodTroubleProductionDemoVideo
              active={videoActive}
              onActivate={() => setVideoActive(true)}
            />
            <p className="abx-home-good-trouble__media-footnote">{copy.mediaFootnote}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
