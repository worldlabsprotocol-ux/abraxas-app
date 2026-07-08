"use client";
// FILE: components/redesign/ProductLoopDemo.tsx
// ~30s auto-advancing product walkthrough: browse → book → sign-in → pay → verify.

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PRODUCT_LOOP_STEPS } from "@/lib/productLoopSteps";
import { CapabilityStatusBadge } from "@/components/ui/CapabilityStatusBadge";
import { ProductLoopStepVisual } from "./ProductLoopStepVisual";
import { Btn } from "./ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export function ProductLoopDemo() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const step = PRODUCT_LOOP_STEPS[index];

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => {
      setIndex(i => (i + 1) % PRODUCT_LOOP_STEPS.length);
    }, step.durationMs);
    return () => clearTimeout(t);
  }, [index, paused, step.durationMs]);

  const progress = ((index + 1) / PRODUCT_LOOP_STEPS.length) * 100;

  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
        <div>
          <div style={{
            fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700,
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: ACCENT, marginBottom: "0.5rem",
          }}>
            End-to-end example
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap", marginBottom: "0.35rem" }}>
            <CapabilityStatusBadge status="pilot" size="xs" />
            <span style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)" }}>
              Example proof loop — same engine partners integrate
            </span>
          </div>
          <h2 style={{
            fontFamily: FONT, fontSize: "var(--fs-h1)", fontWeight: 800,
            letterSpacing: "-0.03em", lineHeight: 1.05,
            color: "var(--text-primary)", margin: 0, maxWidth: 520,
          }}>
            See verification in action
          </h2>
          <p style={{
            fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)",
            lineHeight: 1.6, maxWidth: 480, margin: "0.5rem 0 0",
          }}>
            One reference journey — not a separate product line.
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
        {/* Visual panel */}
        <div style={{ position: "relative", minHeight: 320, background: "#0a0f14" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45 }}
              style={{ position: "absolute", inset: 0 }}
            >
              {step.image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={step.image}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: step.imageObjectPosition ?? "center",
                  }}
                />
              ) : (
                <div style={{
                  width: "100%", height: "100%",
                  background: `
                    radial-gradient(ellipse 70% 55% at 15% 20%, rgba(16,185,129,0.22) 0%, transparent 55%),
                    radial-gradient(ellipse 50% 45% at 85% 80%, rgba(59,130,246,0.14) 0%, transparent 50%),
                    linear-gradient(160deg, #0d151c 0%, #06090B 100%)
                  `,
                }} />
              )}
              <div style={{
                position: "absolute", inset: 0,
                background: step.image
                  ? "linear-gradient(to top, rgba(6,9,11,0.92) 0%, rgba(6,9,11,0.45) 50%, rgba(6,9,11,0.2) 100%)"
                  : "linear-gradient(to top, rgba(6,9,11,0.55) 0%, rgba(6,9,11,0.15) 100%)",
              }} />
              <ProductLoopStepVisual stepId={step.id} />
            </motion.div>
          </AnimatePresence>

          <div style={{ position: "absolute", top: 16, left: 16, right: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{
              fontFamily: FONT, fontSize: "0.62rem", fontWeight: 700,
              padding: "0.3rem 0.6rem", borderRadius: 999,
              background: "rgba(0,0,0,0.55)", color: step.badge?.includes("✓") ? ACCENT : "#fff",
              border: `1px solid ${step.badge?.includes("✓") ? "rgba(16,185,129,0.5)" : "rgba(255,255,255,0.2)"}`,
            }}>
              {step.badge}
            </span>
            <span style={{ fontFamily: MONO, fontSize: "0.55rem", color: "rgba(255,255,255,0.5)" }}>
              {index + 1}/{PRODUCT_LOOP_STEPS.length}
            </span>
          </div>

          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "1.25rem" }}>
            <AnimatePresence mode="wait">
              <motion.div key={step.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div style={{ fontFamily: FONT, fontSize: "1.15rem", fontWeight: 800, color: "#fff", marginBottom: "0.35rem" }}>
                  {step.title}
                </div>
                <div style={{ fontFamily: FONT, fontSize: "0.78rem", color: "rgba(255,255,255,0.75)", lineHeight: 1.55, marginBottom: "0.85rem" }}>
                  {step.subtitle}
                </div>
                {step.metrics && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                    {step.metrics.map(m => (
                      <div key={m.label} style={{
                        padding: "0.35rem 0.65rem", borderRadius: 8,
                        background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.12)",
                      }}>
                        <div style={{ fontFamily: MONO, fontSize: "0.48rem", color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>{m.label}</div>
                        <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: ACCENT }}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Progress bar */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "rgba(255,255,255,0.08)" }}>
            <motion.div
              key={`${index}-${paused}`}
              initial={{ width: "0%" }}
              animate={{ width: paused ? `${((index) / PRODUCT_LOOP_STEPS.length) * 100}%` : "100%" }}
              transition={{ duration: paused ? 0 : step.durationMs / 1000, ease: "linear" }}
              style={{ height: "100%", background: ACCENT }}
            />
          </div>
        </div>

        {/* Step picker */}
        <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.35rem" }}>
            Jump to step
          </div>
          {PRODUCT_LOOP_STEPS.map((s, i) => (
            <button
              key={s.id}
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
          ))}

          <div style={{ marginTop: "auto", paddingTop: "0.75rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            <Btn href="/flagship" size="sm">Book genesis pilot →</Btn>
            <Btn href="#test-network" variant="secondary" size="sm">Test the network</Btn>
          </div>

          <p style={{ fontFamily: FONT, fontSize: "0.62rem", color: "var(--text-muted)", margin: "0.5rem 0 0", lineHeight: 1.5 }}>
            Auto-advances every 5–7s · full loop ~{Math.round(PRODUCT_LOOP_STEPS.reduce((a, s) => a + s.durationMs, 0) / 1000)}s
          </p>
        </div>
      </div>

      {/* Overall progress */}
      <div style={{ marginTop: "0.65rem", height: 2, borderRadius: 999, background: "var(--border)", overflow: "hidden" }}>
        <div style={{ width: `${progress}%`, height: "100%", background: ACCENT, transition: "width 0.4s ease" }} />
      </div>
    </section>
  );
}
