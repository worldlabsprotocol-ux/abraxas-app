// FILE: components/AboutCarousel.tsx
// Horizontal scrolling explainer at the top of the terminal tab.
// 8 slides, same as Instagram carousel, but in compact horizontal scroll.
// Dismissible (localStorage flag), expanded by default for new visitors.
"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link  from "next/link";

const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const G = "#10B981";

const SLIDES = [
  { src: "/about/01_cover.png",      title: "Abraxas in 60 seconds" },
  { src: "/about/02_problem.png",    title: "The Problem" },
  { src: "/about/03_broken.png",     title: "Why RWA Keeps Failing" },
  { src: "/about/04_approach.png",   title: "Verify First" },
  { src: "/about/05_pipeline.png",   title: "7-Step Pipeline" },
  { src: "/about/06_genesis.png",    title: "Cielo Sunrise" },
  { src: "/about/07_verticals.png",  title: "Asset Verticals" },
  { src: "/about/08_cta.png",        title: "Trust Layer" },
];

const DISMISS_KEY = "abraxas_about_dismissed_v1";

export function AboutCarousel() {
  const [expanded, setExpanded] = useState(true);
  const [idx, setIdx]           = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = window.localStorage.getItem(DISMISS_KEY);
    if (dismissed === "1") setExpanded(false);
  }, []);

  const dismiss = () => {
    setExpanded(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISS_KEY, "1");
    }
  };

  const scrollTo = (i: number) => {
    const next = Math.max(0, Math.min(SLIDES.length - 1, i));
    setIdx(next);
    if (trackRef.current) {
      const child = trackRef.current.children[next] as HTMLElement;
      if (child) {
        trackRef.current.scrollTo({
          left: child.offsetLeft - 16,
          behavior: "smooth",
        });
      }
    }
  };

  if (!expanded) {
    return (
      <div style={{
        padding: "0.5rem clamp(0.75rem,2.5vw,1.5rem)",
        borderBottom: "1px solid #1C2333",
        background: "#070A0F",
        display: "flex", alignItems: "center", gap: "0.75rem",
      }}>
        <button onClick={() => setExpanded(true)} style={{
          padding: "0.35rem 0.75rem", borderRadius: 4,
          border: `1px solid ${G}30`, background: `${G}08`,
          color: G, fontFamily: M, fontSize: "0.34rem", fontWeight: 700,
          cursor: "pointer", textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}>
          ⊕ WHAT IS ABRAXAS?
        </button>
        <span style={{ fontFamily: M, fontSize: "0.3rem",
                        color: "rgba(255,255,255,0.3)",
                        letterSpacing: "0.1em" }}>
          Click to view the 60-second explainer
        </span>
      </div>
    );
  }

  return (
    <div style={{
      borderBottom: "1px solid #1C2333",
      background: "#070A0F",
      position: "relative",
    }}>
      {/* Header strip */}
      <div style={{
        padding: "0.625rem clamp(0.75rem,2.5vw,1.5rem)",
        display: "flex", alignItems: "center", gap: "0.75rem",
        borderBottom: "1px solid #12182A",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: G, boxShadow: `0 0 5px ${G}80`,
          }}/>
          <span style={{ fontFamily: M, fontSize: "0.32rem", fontWeight: 700,
                          color: G, letterSpacing: "0.15em",
                          textTransform: "uppercase" }}>
            WHAT IS ABRAXAS · {(idx + 1).toString().padStart(2,'0')} / {SLIDES.length.toString().padStart(2,'0')}
          </span>
        </div>
        <span style={{ flex: 1 }} />
        <Link href="/about" style={{
          fontFamily: M, fontSize: "0.3rem",
          color: "rgba(255,255,255,0.4)",
          textDecoration: "none", letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}>
          Full explainer →
        </Link>
        <button onClick={dismiss} style={{
          padding: "0.2rem 0.5rem", borderRadius: 3,
          border: "1px solid #1C2333", background: "transparent",
          color: "rgba(255,255,255,0.4)", fontFamily: M,
          fontSize: "0.3rem", fontWeight: 700,
          cursor: "pointer", letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}>
          DISMISS
        </button>
      </div>

      {/* Horizontal scrolling track */}
      <div ref={trackRef} style={{
        display: "flex", gap: "0.75rem",
        padding: "1rem clamp(0.75rem,2.5vw,1.5rem)",
        overflowX: "auto",
        scrollSnapType: "x mandatory",
        WebkitOverflowScrolling: "touch",
      }}>
        {SLIDES.map((s, i) => (
          <div key={s.src} style={{
            flexShrink: 0,
            width: "clamp(240px, 60vw, 320px)",
            scrollSnapAlign: "start",
            borderRadius: 8,
            overflow: "hidden",
            border: `1px solid ${i === idx ? G : "#1C2333"}`,
            transition: "border-color 0.2s",
            cursor: "pointer",
            position: "relative",
            aspectRatio: "1 / 1",
            background: "#FFFFFF",
          }}
          onClick={() => scrollTo(i)}>
            <Image
              src={s.src}
              alt={s.title}
              fill
              sizes="320px"
              loading={i < 2 ? "eager" : "lazy"}
              style={{ objectFit: "cover" }}
            />
          </div>
        ))}
      </div>

      {/* Controls + dots */}
      <div style={{
        padding: "0.5rem clamp(0.75rem,2.5vw,1.5rem) 0.875rem",
        display: "flex", alignItems: "center", gap: "0.5rem",
        justifyContent: "center",
      }}>
        <button onClick={() => scrollTo(idx - 1)} disabled={idx === 0} style={{
          padding: "0.3rem 0.625rem", borderRadius: 3,
          border: "1px solid #1C2333", background: "transparent",
          color: idx === 0 ? "rgba(255,255,255,0.15)" : G,
          fontFamily: M, fontSize: "0.36rem", fontWeight: 900,
          cursor: idx === 0 ? "default" : "pointer",
        }}>←</button>
        <div style={{ display: "flex", gap: "0.25rem" }}>
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => scrollTo(i)} style={{
              width: 7, height: 7, borderRadius: "50%", border: "none",
              padding: 0, cursor: "pointer",
              background: i === idx ? G : "rgba(255,255,255,0.15)",
              transition: "background 0.2s",
            }}/>
          ))}
        </div>
        <button onClick={() => scrollTo(idx + 1)} disabled={idx === SLIDES.length-1} style={{
          padding: "0.3rem 0.625rem", borderRadius: 3,
          border: "1px solid #1C2333", background: "transparent",
          color: idx === SLIDES.length-1 ? "rgba(255,255,255,0.15)" : G,
          fontFamily: M, fontSize: "0.36rem", fontWeight: 900,
          cursor: idx === SLIDES.length-1 ? "default" : "pointer",
        }}>→</button>
      </div>
    </div>
  );
}
