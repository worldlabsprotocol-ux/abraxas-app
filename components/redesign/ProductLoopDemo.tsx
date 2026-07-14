"use client";
// FILE: components/redesign/ProductLoopDemo.tsx
// Clean diagram walkthrough — copy in sidebar, visuals stay minimal (1-1-1).

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PRODUCT_LOOP_STEPS, PRODUCT_LOOP_TOTAL_MS } from "@/lib/productLoopSteps";
import { CPG_ASSET } from "@/lib/cpgLandCaseStudy";
import { themeForStep } from "@/lib/productLoopStepThemes";
import { ProductLoopDiagramBackdrop, ProductLoopStepVisual } from "./ProductLoopStepVisual";
import { Btn } from "./ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export function ProductLoopDemo() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const step = PRODUCT_LOOP_STEPS[index];
  const theme = themeForStep(step.id);

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => {
      setIndex(i => (i + 1) % PRODUCT_LOOP_STEPS.length);
    }, step.durationMs);
    return () => clearTimeout(t);
  }, [index, paused, step.durationMs]);

  const progress = ((index + 1) / PRODUCT_LOOP_STEPS.length) * 100;

  return (
    <section id="product-loop" aria-labelledby="product-loop-heading">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
        <div>
          <div className="abx-eyebrow-violet" style={{ marginBottom: "0.5rem" }}>
            Stop re-forwarding documents
          </div>
          <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: "0 0 0.35rem" }}>
            Verify once · share globally · settle on Abraxas
          </p>
          <h2 id="product-loop-heading" style={{
            fontFamily: FONT, fontSize: "var(--fs-h1)", fontWeight: 800,
            letterSpacing: "-0.03em", lineHeight: 1.05,
            color: "var(--text-primary)", margin: 0, maxWidth: 520,
          }}>
            From inbox chaos to closed-loop deals
          </h2>
          <p style={{
            fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)",
            lineHeight: 1.6, maxWidth: 480, margin: "0.5rem 0 0",
          }}>
            Five steps. Email spam → Abraxas Passport → global buyers → USDC settlement.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPaused(p => !p)}
          style={{
            padding: "0.45rem 0.85rem", borderRadius: 999,
            border: "1px solid var(--border)", background: "var(--surface)",
            fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600,
            color: "var(--text-secondary)", cursor: "pointer",
          }}
        >
          {paused ? "Resume ▶" : "Pause ⏸"}
        </button>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
        gap: "1.25rem",
        borderRadius: 20, overflow: "hidden",
        border: "1px solid var(--border-strong)",
        background: "var(--surface-raised)",
      }}>
        {/* Visual panel — diagram only, no text overlay */}
        <div style={{ position: "relative", minHeight: 300, background: "#0a0f14" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              style={{ position: "absolute", inset: 0, background: theme.gradient }}
            >
              <ProductLoopDiagramBackdrop stepId={step.id} />
              <ProductLoopStepVisual stepId={step.id} />
            </motion.div>
          </AnimatePresence>

          <div style={{ position: "absolute", top: 16, left: 16, right: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start", pointerEvents: "none" }}>
            <span style={{
              fontFamily: FONT, fontSize: "0.62rem", fontWeight: 700,
              padding: "0.3rem 0.6rem", borderRadius: 999,
              background: "rgba(0,0,0,0.55)", color: "#fff",
              border: `1px solid ${theme.accent}55`,
            }}>
              {step.badge}
            </span>
            <span style={{ fontFamily: MONO, fontSize: "0.55rem", color: "rgba(255,255,255,0.5)" }}>
              {index + 1}/{PRODUCT_LOOP_STEPS.length}
            </span>
          </div>

          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "rgba(255,255,255,0.08)" }}>
            <motion.div
              key={`${index}-${paused}`}
              initial={{ width: "0%" }}
              animate={{ width: paused ? `${(index / PRODUCT_LOOP_STEPS.length) * 100}%` : "100%" }}
              transition={{ duration: paused ? 0 : step.durationMs / 1000, ease: "linear" }}
              style={{ height: "100%", background: ACCENT }}
            />
          </div>
        </div>

        {/* Step picker + active step copy */}
        <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.15rem" }}>
            Jump to step
          </div>
          {PRODUCT_LOOP_STEPS.map((s, i) => (
            <div key={s.id} style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <button
                type="button"
                onClick={() => { setIndex(i); setPaused(false); }}
                style={{
                  textAlign: "left", padding: "0.65rem 0.75rem", borderRadius: 10,
                  border: `1px solid ${i === index ? "rgba(16,185,129,0.4)" : "var(--border)"}`,
                  background: i === index ? "rgba(16,185,129,0.1)" : "var(--surface)",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontFamily: MONO, fontSize: "0.52rem", color: i === index ? ACCENT : "var(--text-muted)", marginBottom: 2 }}>
                  0{i + 1}
                </div>
                <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: i === index ? 700 : 500, color: "var(--text-primary)" }}>
                  {s.title}
                </div>
              </button>
            </div>
          ))}

          {/* Active step detail — all copy lives here, not on the visual */}
          <div style={{
            marginTop: "0.5rem", padding: "1rem", borderRadius: 12,
            border: "1px solid rgba(16,185,129,0.25)", background: "rgba(16,185,129,0.06)",
          }}>
            <div style={{ fontFamily: FONT, fontSize: "0.92rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
              {step.title}
            </div>
            <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.55, margin: "0 0 0.75rem" }}>
              {step.subtitle}
            </p>
            {step.metrics && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", marginBottom: "0.85rem" }}>
                {step.metrics.map(m => (
                  <div key={m.label} style={{
                    padding: "0.3rem 0.55rem", borderRadius: 8,
                    background: "var(--surface)", border: "1px solid var(--border)",
                  }}>
                    <div style={{ fontFamily: MONO, fontSize: "0.48rem", color: "var(--text-muted)", textTransform: "uppercase" }}>{m.label}</div>
                    <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: ACCENT }}>{m.value}</div>
                  </div>
                ))}
              </div>
            )}
            <Link
              href={step.href}
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.35rem",
                padding: "0.55rem 0.95rem", borderRadius: 999,
                background: ACCENT, color: "#04130C",
                fontFamily: FONT, fontSize: "0.72rem", fontWeight: 800,
                textDecoration: "none",
              }}
            >
              {step.ctaLabel} →
            </Link>
          </div>

          <div style={{ marginTop: "auto", paddingTop: "0.75rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            <Btn href={CPG_ASSET.inquirePath} size="sm">Acquire on Abraxas →</Btn>
            <Btn href="/passport" variant="secondary" size="sm">Create Passport</Btn>
          </div>

          <p style={{ fontFamily: FONT, fontSize: "0.62rem", color: "var(--text-muted)", margin: "0.5rem 0 0", lineHeight: 1.5 }}>
            Auto-advances every 5 to 7s · full loop ~{Math.round(PRODUCT_LOOP_TOTAL_MS / 1000)}s
          </p>
        </div>
      </div>

      <div style={{ marginTop: "0.65rem", height: 2, borderRadius: 999, background: "var(--border)", overflow: "hidden" }}>
        <div style={{ width: `${progress}%`, height: "100%", background: ACCENT, transition: "width 0.4s ease" }} />
      </div>
    </section>
  );
}
