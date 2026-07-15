"use client";
// FILE: components/redesign/ProductLoopDemo.tsx
// Protocol demo — visual-first on home (Becker/Yan positioning, Ansem hooks).

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PRODUCT_LOOP_STEPS,
  PRODUCT_LOOP_TOTAL_MS,
  PRODUCT_LOOP_HOME_PITCH,
} from "@/lib/productLoopSteps";
import { CPG_ASSET } from "@/lib/cpgLandCaseStudy";
import { themeForStep } from "@/lib/productLoopStepThemes";
import { ProductLoopDiagramBackdrop, ProductLoopStepVisual } from "./ProductLoopStepVisual";
import { Btn } from "./ui";
import {
  INSTITUTIONAL_GOLD,
  INSTITUTIONAL_GOLD_PALE,
  INSTITUTIONAL_PRIMARY_BTN_BG,
  INSTITUTIONAL_PRIMARY_BTN_TEXT,
  TEXT_ON_DARK,
} from "@/lib/design/institutionalTheme";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

function StepVisualPanel({
  step,
  theme,
  index,
  paused,
  home,
  totalSteps,
}: {
  step: (typeof PRODUCT_LOOP_STEPS)[number];
  theme: ReturnType<typeof themeForStep>;
  index: number;
  paused: boolean;
  home: boolean;
  totalSteps: number;
}) {
  const progressColor = home ? INSTITUTIONAL_GOLD : ACCENT;

  return (
    <div
      className="product-loop-visual"
      style={{
        position: "relative",
        minHeight: home ? undefined : 300,
        aspectRatio: home ? "16 / 9" : undefined,
        background: "#06090B",
        borderRadius: home ? 16 : undefined,
        overflow: "hidden",
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          initial={{ opacity: 0, scale: home ? 0.985 : 1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: home ? 1.01 : 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: "absolute", inset: 0, background: theme.gradient }}
        >
          <ProductLoopDiagramBackdrop stepId={step.id} />
          <ProductLoopStepVisual stepId={step.id} home={home} />
        </motion.div>
      </AnimatePresence>

      {home && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: `
              radial-gradient(ellipse 80% 50% at 50% 100%, rgba(0,0,0,0.72) 0%, transparent 70%),
              linear-gradient(180deg, transparent 55%, rgba(4,5,10,0.85) 100%)
            `,
          }}
        />
      )}

      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          right: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            fontFamily: MONO,
            fontSize: "0.58rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "0.32rem 0.65rem",
            borderRadius: 999,
            background: "rgba(0,0,0,0.62)",
            color: home ? INSTITUTIONAL_GOLD_PALE : "#fff",
            border: `1px solid ${theme.accent}66`,
          }}
        >
          {step.badge}
        </span>
        <span style={{ fontFamily: MONO, fontSize: "0.55rem", color: "rgba(255,255,255,0.45)" }}>
          {String(index + 1).padStart(2, "0")}/{String(totalSteps).padStart(2, "0")}
        </span>
      </div>

      {home && (
        <motion.div
          key={step.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.12 }}
          style={{
            position: "absolute",
            left: "clamp(1rem, 3vw, 1.5rem)",
            right: "clamp(1rem, 3vw, 1.5rem)",
            bottom: 14,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              fontFamily: FONT,
              fontSize: "clamp(1.05rem, 2.8vw, 1.45rem)",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              color: TEXT_ON_DARK.primary,
              textShadow: "0 2px 24px rgba(0,0,0,0.85)",
              maxWidth: 520,
            }}
          >
            {step.hook}
          </div>
        </motion.div>
      )}

      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: home ? 4 : 3,
          background: "rgba(255,255,255,0.06)",
        }}
      >
        <motion.div
          key={`${index}-${paused}`}
          initial={{ width: "0%" }}
          animate={{ width: paused ? `${(index / totalSteps) * 100}%` : "100%" }}
          transition={{ duration: paused ? 0 : step.durationMs / 1000, ease: "linear" }}
          style={{ height: "100%", background: progressColor }}
        />
      </div>
    </div>
  );
}

function StepPills({
  index,
  onSelect,
  home,
}: {
  index: number;
  onSelect: (i: number) => void;
  home: boolean;
}) {
  const activeColor = home ? INSTITUTIONAL_GOLD : ACCENT;

  return (
    <div
      className="product-loop-pills"
      style={{
        display: "flex",
        flexDirection: home ? "row" : "column",
        gap: home ? "0.4rem" : "0.35rem",
        flexWrap: home ? "wrap" : "nowrap",
        marginTop: home ? "0.85rem" : 0,
        marginBottom: home ? "0.85rem" : 0,
      }}
    >
      {PRODUCT_LOOP_STEPS.map((s, i) => {
        const active = i === index;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(i)}
            aria-current={active ? "step" : undefined}
            style={{
              flex: home ? "1 1 auto" : undefined,
              minWidth: home ? 0 : undefined,
              textAlign: "left",
              padding: home ? "0.55rem 0.65rem" : "0.65rem 0.75rem",
              borderRadius: home ? 12 : 10,
              border: `1px solid ${active ? `${activeColor}55` : "var(--border)"}`,
              background: active
                ? home
                  ? "rgba(232,197,71,0.1)"
                  : "rgba(16,185,129,0.1)"
                : "var(--surface)",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: "0.48rem",
                color: active ? activeColor : "var(--text-muted)",
                marginBottom: 2,
                letterSpacing: "0.06em",
              }}
            >
              0{i + 1}
            </div>
            <div
              style={{
                fontFamily: FONT,
                fontSize: home ? "0.68rem" : "0.78rem",
                fontWeight: active ? 800 : 500,
                color: "var(--text-primary)",
                lineHeight: 1.25,
                ...(home ? { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } : {}),
              }}
            >
              {home ? s.badge : s.title}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ActiveStepPanel({
  step,
  home,
}: {
  step: (typeof PRODUCT_LOOP_STEPS)[number];
  home: boolean;
}) {
  const ctaBg = home ? INSTITUTIONAL_PRIMARY_BTN_BG : ACCENT;
  const ctaColor = home ? INSTITUTIONAL_PRIMARY_BTN_TEXT : "#04130C";
  const metricColor = home ? INSTITUTIONAL_GOLD : ACCENT;

  return (
    <div
      className="product-loop-active"
      style={{
        padding: home ? "1.1rem 1.15rem" : "1rem",
        borderRadius: 14,
        border: home ? "1px solid rgba(232,197,71,0.22)" : "1px solid rgba(16,185,129,0.25)",
        background: home ? "rgba(232,197,71,0.05)" : "rgba(16,185,129,0.06)",
      }}
    >
      <div
        style={{
          fontFamily: FONT,
          fontSize: home ? "1rem" : "0.92rem",
          fontWeight: 800,
          color: "var(--text-primary)",
          marginBottom: "0.35rem",
          letterSpacing: "-0.02em",
        }}
      >
        {step.title}
      </div>
      <p
        style={{
          fontFamily: FONT,
          fontSize: "0.76rem",
          color: "var(--text-secondary)",
          lineHeight: 1.6,
          margin: "0 0 0.85rem",
          maxWidth: home ? 640 : undefined,
        }}
      >
        {step.subtitle}
      </p>
      {step.metrics && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", marginBottom: "0.85rem" }}>
          {step.metrics.map(m => (
            <div
              key={m.label}
              style={{
                padding: "0.35rem 0.6rem",
                borderRadius: 8,
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: "0.46rem",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {m.label}
              </div>
              <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: metricColor }}>
                {m.value}
              </div>
            </div>
          ))}
        </div>
      )}
      <Link
        href={step.href}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.35rem",
          padding: "0.55rem 0.95rem",
          borderRadius: 999,
          background: ctaBg,
          color: ctaColor,
          fontFamily: FONT,
          fontSize: "0.72rem",
          fontWeight: 800,
          textDecoration: "none",
          boxShadow: home ? "0 0 0 1px rgba(232,197,71,0.25)" : undefined,
        }}
      >
        {step.ctaLabel} →
      </Link>
    </div>
  );
}

export function ProductLoopDemo({ home = false }: { home?: boolean }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const step = PRODUCT_LOOP_STEPS[index];
  const theme = themeForStep(step.id);
  const sectionId = home ? "demo" : "product-loop";
  const headingId = home ? "demo-heading" : "product-loop-heading";
  const loopSec = Math.round(PRODUCT_LOOP_TOTAL_MS / 1000);
  const progressColor = home ? INSTITUTIONAL_GOLD : ACCENT;

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => {
      setIndex(i => (i + 1) % PRODUCT_LOOP_STEPS.length);
    }, step.durationMs);
    return () => clearTimeout(t);
  }, [index, paused, step.durationMs]);

  const progress = ((index + 1) / PRODUCT_LOOP_STEPS.length) * 100;

  const selectStep = (i: number) => {
    setIndex(i);
    setPaused(false);
  };

  return (
    <section id={sectionId} aria-labelledby={headingId} className={home ? "product-loop-home" : undefined}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: home ? "1.1rem" : "1rem",
        }}
      >
        <div style={{ maxWidth: home ? 620 : 520 }}>
          <div className="abx-eyebrow-violet" style={{ marginBottom: "0.5rem" }}>
            {home ? "Protocol demo · 5-step loop" : "Stop re-forwarding documents"}
          </div>
          {!home && (
            <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: "0 0 0.35rem" }}>
              Verify once · share globally · settle on Abraxas
            </p>
          )}
          <h2
            id={headingId}
            style={{
              fontFamily: FONT,
              fontSize: home ? "var(--fs-h2)" : "var(--fs-h1)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: home ? 1.08 : 1.05,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            {home ? (
              <>
                <span style={{ color: TEXT_ON_DARK.primary }}>Verify once. </span>
                <span className="abx-gradient-text">Reuse everywhere.</span>
              </>
            ) : (
              "From inbox chaos to closed-loop deals"
            )}
          </h2>
          {home ? (
            <p
              style={{
                fontFamily: FONT,
                fontSize: "0.82rem",
                color: "var(--text-secondary)",
                lineHeight: 1.65,
                margin: "0.55rem 0 0",
                maxWidth: 560,
              }}
            >
              {PRODUCT_LOOP_HOME_PITCH}
            </p>
          ) : (
            <p
              style={{
                fontFamily: FONT,
                fontSize: "0.78rem",
                color: "var(--text-secondary)",
                lineHeight: 1.6,
                maxWidth: 480,
                margin: "0.5rem 0 0",
              }}
            >
              Five steps. Email spam → Abraxas Passport → global buyers → USDC settlement.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setPaused(p => !p)}
          aria-pressed={paused}
          style={{
            padding: "0.45rem 0.85rem",
            borderRadius: 999,
            border: `1px solid ${home ? "rgba(232,197,71,0.35)" : "var(--border)"}`,
            background: home ? "rgba(232,197,71,0.08)" : "var(--surface)",
            fontFamily: FONT,
            fontSize: "0.72rem",
            fontWeight: 600,
            color: home ? INSTITUTIONAL_GOLD_PALE : "var(--text-secondary)",
            cursor: "pointer",
          }}
        >
          {paused ? "Resume ▶" : "Pause ⏸"}
        </button>
      </div>

      {home ? (
        <div
          className="abx-glass-panel product-loop-home-shell"
          style={{
            borderRadius: 18,
            overflow: "hidden",
            border: "1px solid var(--border-strong)",
            background: "var(--surface-raised)",
            padding: "clamp(0.65rem, 2vw, 0.85rem)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <StepVisualPanel
            step={step}
            theme={theme}
            index={index}
            paused={paused}
            home
            totalSteps={PRODUCT_LOOP_STEPS.length}
          />
          <StepPills index={index} onSelect={selectStep} home />
          <ActiveStepPanel step={step} home />
          <div
            className="product-loop-footer-ctas"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.5rem",
              marginTop: "0.85rem",
              alignItems: "center",
            }}
          >
            <Btn href="/passport" size="sm">
              Create Passport →
            </Btn>
            <Btn href="/#registry" variant="secondary" size="sm">
              Browse assets →
            </Btn>
            <Btn href={CPG_ASSET.inquirePath} variant="ghost" size="sm">
              Acquire on Abraxas →
            </Btn>
            <span
              className="product-loop-timing"
              style={{
                fontFamily: MONO,
                fontSize: "0.58rem",
                color: "var(--text-muted)",
                letterSpacing: "0.04em",
                marginLeft: "auto",
              }}
            >
              ~{loopSec}s loop · auto-advances
            </span>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
            gap: "1.25rem",
            borderRadius: 20,
            overflow: "hidden",
            border: "1px solid var(--border-strong)",
            background: "var(--surface-raised)",
          }}
        >
          <StepVisualPanel
            step={step}
            theme={theme}
            index={index}
            paused={paused}
            home={false}
            totalSteps={PRODUCT_LOOP_STEPS.length}
          />
          <div className="product-loop-sidebar" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div
              className="product-loop-step-list-label"
              style={{
                fontFamily: MONO,
                fontSize: "0.58rem",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                marginBottom: "0.15rem",
              }}
            >
              5-step loop
            </div>
            <div className="product-loop-step-list">
              <StepPills index={index} onSelect={selectStep} home={false} />
            </div>
            <ActiveStepPanel step={step} home={false} />
            <div
              className="product-loop-footer-ctas"
              style={{ marginTop: "auto", paddingTop: "0.75rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}
            >
              <Btn href={CPG_ASSET.inquirePath} size="sm">
                Acquire on Abraxas →
              </Btn>
              <Btn href="/passport" variant="secondary" size="sm">
                Create Passport
              </Btn>
            </div>
            <p
              className="product-loop-timing"
              style={{
                fontFamily: FONT,
                fontSize: "0.62rem",
                color: "var(--text-muted)",
                margin: "0.5rem 0 0",
                lineHeight: 1.5,
              }}
            >
              Auto-advances every 5 to 7s · full loop ~{loopSec}s
            </p>
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: "0.65rem",
          height: 2,
          borderRadius: 999,
          background: "var(--border)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            background: progressColor,
            transition: "width 0.4s ease",
          }}
        />
      </div>

      {home && (
        <style jsx>{`
          @media (max-width: 640px) {
            .product-loop-home :global(.product-loop-pills button) {
              flex: 1 1 calc(33% - 0.4rem);
            }
            .product-loop-home :global(.product-loop-timing) {
              width: 100%;
              margin-left: 0 !important;
              margin-top: 0.15rem;
            }
            .product-loop-home :global(.product-loop-footer-ctas) {
              gap: 0.45rem;
            }
          }
        `}</style>
      )}
    </section>
  );
}
