// FILE: components/ExplainerCarousel.tsx
// Auto-advancing carousel for the 8-slide Abraxas explainer.
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";

const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const G = "#10B981";
const BDR = "#1C2333";
const W = "#F8FAFC";

const SLIDES = [
  { src: "/about/01_cover.png",      title: "What is Abraxas",      label: "OVERVIEW" },
  { src: "/about/02_problem.png",    title: "The Problem",           label: "PROBLEM" },
  { src: "/about/03_broken.png",     title: "Why RWA Fails",         label: "GAP" },
  { src: "/about/04_approach.png",   title: "Verify First",          label: "APPROACH" },
  { src: "/about/05_pipeline.png",   title: "10-Stage Pipeline",     label: "PIPELINE" },
  { src: "/about/06_genesis.png",    title: "Genesis Asset",         label: "PROOF" },
  { src: "/about/07_verticals.png",  title: "Asset Verticals",       label: "MARKETS" },
  { src: "/about/08_cta.png",        title: "Trust Layer",           label: "VISION" },
];

const AUTO_ADVANCE_MS = 7000;

export function ExplainerCarousel() {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (paused) return;
    timerRef.current = setInterval(() => {
      setIdx(i => (i + 1) % SLIDES.length);
    }, AUTO_ADVANCE_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused]);

  const goTo = useCallback((i: number) => {
    setIdx(((i % SLIDES.length) + SLIDES.length) % SLIDES.length);
  }, []);
  const next = () => goTo(idx + 1);
  const prev = () => goTo(idx - 1);

  const current = SLIDES[idx];

  return (
    <div
      style={{
        background: "#0A0C10",
        borderBottom: `1px solid ${BDR}`,
        padding: "1rem clamp(0.75rem,2.5vw,1.5rem) 1.25rem",
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
    >
      {/* Header bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: G, boxShadow: `0 0 6px ${G}90`,
            animation: paused ? "none" : "abrx-pulse 2s ease-in-out infinite",
          }} />
          <span style={{
            fontFamily: M, fontSize: "0.34rem", fontWeight: 700, color: W,
            letterSpacing: "0.12em", textTransform: "uppercase",
          }}>
            EXPLAINER · {current.label} · {String(idx + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
          </span>
          {paused && (
            <span style={{
              fontFamily: M, fontSize: "0.28rem", color: "rgba(255,255,255,0.3)",
              letterSpacing: "0.1em",
            }}>
              · PAUSED
            </span>
          )}
        </div>
        <a href="/about" style={{
          padding: "0.25rem 0.625rem", borderRadius: 3,
          border: `1px solid ${G}40`, background: `${G}10`,
          color: G, fontFamily: M, fontSize: "0.3rem", fontWeight: 700,
          textDecoration: "none", textTransform: "uppercase",
          letterSpacing: "0.08em", whiteSpace: "nowrap",
        }}>
          FULL PAGE &#8594;
        </a>
      </div>

      {/* Main slide area */}
      <div style={{
        position: "relative",
        maxWidth: 720, margin: "0 auto",
        aspectRatio: "1 / 1",
        background: "#000",
        borderRadius: 8,
        overflow: "hidden",
        border: `1px solid ${BDR}`,
      }}>
        {/* Render all slides stacked, only active visible */}
        {SLIDES.map((s, i) => (
          <div key={s.src} style={{
            position: "absolute", inset: 0,
            opacity: i === idx ? 1 : 0,
            transition: "opacity 0.5s ease-in-out",
            pointerEvents: i === idx ? "auto" : "none",
          }}>
            <Image
              src={s.src}
              alt={s.title}
              fill
              priority={i < 2}
              sizes="(max-width: 720px) 100vw, 720px"
              style={{ objectFit: "cover" }}
            />
          </div>
        ))}

        {/* Left arrow */}
        <button
          onClick={prev}
          aria-label="Previous slide"
          style={{
            position: "absolute", left: 8, top: "50%",
            transform: "translateY(-50%)",
            width: 36, height: 36, borderRadius: "50%",
            background: "rgba(10,12,16,0.75)",
            border: `1px solid ${G}50`,
            color: G, fontFamily: M, fontSize: "0.8rem", fontWeight: 900,
            cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(4px)",
            transition: "all 0.15s",
          }}
        >
          &#8592;
        </button>

        {/* Right arrow */}
        <button
          onClick={next}
          aria-label="Next slide"
          style={{
            position: "absolute", right: 8, top: "50%",
            transform: "translateY(-50%)",
            width: 36, height: 36, borderRadius: "50%",
            background: "rgba(10,12,16,0.75)",
            border: `1px solid ${G}50`,
            color: G, fontFamily: M, fontSize: "0.8rem", fontWeight: 900,
            cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(4px)",
            transition: "all 0.15s",
          }}
        >
          &#8594;
        </button>
      </div>

      {/* Dot indicators + progress bar */}
      <div style={{
        maxWidth: 720, margin: "0.75rem auto 0",
        display: "flex", alignItems: "center", gap: "0.625rem",
      }}>
        {/* Dots */}
        <div style={{ display: "flex", gap: "0.4rem", flex: 1, justifyContent: "center" }}>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              style={{
                width: i === idx ? 24 : 8,
                height: 8, borderRadius: 4, border: "none",
                background: i === idx ? G : "rgba(255,255,255,0.2)",
                cursor: "pointer",
                transition: "all 0.3s",
                padding: 0,
              }}
            />
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        maxWidth: 720, margin: "0.5rem auto 0",
        height: 2, background: "rgba(255,255,255,0.06)",
        borderRadius: 1, overflow: "hidden",
      }}>
        <div
          key={`${idx}-${paused}`}
          style={{
            height: "100%",
            background: G,
            width: paused ? "0%" : "100%",
            transformOrigin: "left",
            animation: paused ? "none" : `abrx-progress ${AUTO_ADVANCE_MS}ms linear`,
            boxShadow: `0 0 4px ${G}60`,
          }}
        />
      </div>

      <style jsx global>{`
        @keyframes abrx-pulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.4; }
        }
        @keyframes abrx-progress {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </div>
  );
}
