"use client";

import { motion } from "framer-motion";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

export function MacTerminalChrome({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      width: "100%", maxWidth: 400, borderRadius: 10, overflow: "hidden",
      border: "1px solid rgba(52,211,153,0.2)",
      boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 6, padding: "8px 10px",
        background: "rgba(0,0,0,0.45)", borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        {["#FF5F57", "#FEBC2E", "#28C840"].map(c => (
          <span key={c} style={{ width: 8, height: 8, borderRadius: "50%", background: c, opacity: 0.85 }} />
        ))}
        <span style={{ fontFamily: MONO, fontSize: "0.38rem", color: "rgba(255,255,255,0.45)", marginLeft: 6 }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

export function CodeBlock({
  lines,
  highlightLine,
  accent = "#34D399",
}: {
  lines: string[];
  highlightLine?: number;
  accent?: string;
}) {
  return (
    <pre style={{
      margin: 0, padding: "12px 14px", fontFamily: MONO, fontSize: "0.4rem", lineHeight: 1.65,
      color: "rgba(209,250,229,0.85)", overflow: "auto",
    }}>
      {lines.map((line, i) => (
        <div
          key={i}
          style={{
            padding: "1px 6px", margin: "0 -6px", borderRadius: 4,
            background: highlightLine === i ? `${accent}18` : "transparent",
            borderLeft: highlightLine === i ? `2px solid ${accent}` : "2px solid transparent",
          }}
        >
          <span style={{ color: "rgba(255,255,255,0.25)", marginRight: 8 }}>{String(i + 1).padStart(2, "0")}</span>
          {line}
        </div>
      ))}
    </pre>
  );
}

export function BlueprintLayer({
  label,
  sublabel,
  widthPct,
  depth,
  highlight,
  delay = 0,
}: {
  label: string;
  sublabel: string;
  widthPct: number;
  depth: number;
  highlight?: boolean;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, type: "spring", stiffness: 120 }}
      style={{
        width: `${widthPct}%`,
        margin: "0 auto",
        padding: "10px 12px",
        borderRadius: 4,
        border: highlight ? "1px solid rgba(96,165,250,0.65)" : "1px dashed rgba(96,165,250,0.35)",
        background: highlight
          ? "linear-gradient(90deg, rgba(59,130,246,0.18), rgba(59,130,246,0.06))"
          : "rgba(59,130,246,0.04)",
        boxShadow: highlight ? `0 ${depth * 4}px ${depth * 12}px rgba(59,130,246,0.15)` : `0 ${depth * 3}px ${depth * 8}px rgba(0,0,0,0.35)`,
        transform: `translateY(${-depth * 6}px)`,
        position: "relative",
        zIndex: depth,
      }}
    >
      <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 800, color: highlight ? "#BFDBFE" : "#E2E8F0" }}>
        {label}
      </div>
      <div style={{ fontFamily: MONO, fontSize: "0.38rem", color: "rgba(147,197,253,0.65)", marginTop: 4 }}>
        {sublabel}
      </div>
    </motion.div>
  );
}

export function OrbitNode({
  label,
  angle,
  radius,
  active,
  pulse,
}: {
  label: string;
  angle: number;
  radius: number;
  active: boolean;
  pulse?: boolean;
}) {
  const rad = (angle * Math.PI) / 180;
  const x = Math.cos(rad) * radius;
  const y = Math.sin(rad) * radius;

  return (
    <motion.div
      animate={pulse ? { scale: [1, 1.08, 1] } : undefined}
      transition={pulse ? { duration: 1.5, repeat: Infinity } : undefined}
      style={{
        position: "absolute",
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`,
        transform: "translate(-50%, -50%)",
        padding: "6px 10px",
        borderRadius: 999,
        border: `1px solid ${active ? "rgba(167,139,250,0.65)" : "rgba(255,255,255,0.1)"}`,
        background: active ? "rgba(167,139,250,0.18)" : "rgba(255,255,255,0.03)",
        fontFamily: FONT,
        fontSize: "0.52rem",
        fontWeight: 800,
        color: active ? "#EDE9FE" : "rgba(255,255,255,0.4)",
        whiteSpace: "nowrap",
        boxShadow: active ? "0 0 20px rgba(167,139,250,0.25)" : undefined,
      }}
    >
      {label}
    </motion.div>
  );
}

export function DossierFolder({
  title,
  subtitle,
  imageGradient,
  stamps,
}: {
  title: string;
  subtitle: string;
  imageGradient: string;
  stamps?: string[];
}) {
  return (
    <div style={{
      width: "100%", maxWidth: 320, borderRadius: 12, overflow: "hidden",
      border: "1px solid rgba(251,191,36,0.25)",
      background: "linear-gradient(160deg, #1a1510, #0c0a08)",
      boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
    }}>
      <div style={{
        height: 72, background: imageGradient,
        borderBottom: "1px solid rgba(251,191,36,0.15)",
        position: "relative",
      }}>
        <div style={{
          position: "absolute", top: 10, left: 10,
          fontFamily: MONO, fontSize: "0.34rem", fontWeight: 700,
          color: "#FDE68A", letterSpacing: "0.1em",
          padding: "3px 8px", borderRadius: 4,
          background: "rgba(0,0,0,0.45)", border: "1px solid rgba(251,191,36,0.35)",
        }}>
          REFERENCE DOSSIER
        </div>
      </div>
      <div style={{ padding: "12px 14px" }}>
        <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 900, color: "#FAFAFA" }}>{title}</div>
        <div style={{ fontFamily: MONO, fontSize: "0.4rem", color: "rgba(251,191,36,0.75)", marginTop: 4 }}>{subtitle}</div>
        {stamps && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {stamps.map(s => (
              <span key={s} style={{
                fontFamily: MONO, fontSize: "0.34rem", padding: "3px 7px", borderRadius: 4,
                border: "1px solid rgba(16,185,129,0.35)", color: "#6EE7B7",
                background: "rgba(16,185,129,0.1)",
              }}>
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function BrowserVerifierFrame({ children, url }: { children: React.ReactNode; url: string }) {
  return (
    <div style={{
      width: "100%", maxWidth: 380, borderRadius: 8, overflow: "hidden",
      border: "1px solid rgba(16,185,129,0.28)",
      boxShadow: "0 20px 48px rgba(0,0,0,0.45)",
    }}>
      <div style={{
        padding: "8px 10px", background: "#0f1412",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", gap: 8, alignItems: "center",
      }}>
        <div style={{ flex: 1, padding: "4px 10px", borderRadius: 6, background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <span style={{ fontFamily: MONO, fontSize: "0.38rem", color: "rgba(255,255,255,0.5)" }}>{url}</span>
        </div>
      </div>
      <div style={{ padding: 14, background: "linear-gradient(180deg, #081210, #050807)", position: "relative" }}>
        {children}
        <motion.div
          animate={{ top: ["0%", "100%", "0%"] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "linear" }}
          style={{
            position: "absolute", left: 0, right: 0, height: 1,
            background: "linear-gradient(90deg, transparent, rgba(16,185,129,0.5), transparent)",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}

export function MarketTimeline({
  phases,
  activeIndex,
}: {
  phases: { year: string; label: string; tone: "muted" | "active" | "future" }[];
  activeIndex: number;
}) {
  return (
    <div style={{ width: "100%", maxWidth: 400 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, position: "relative" }}>
        <div style={{
          position: "absolute", left: "8%", right: "8%", top: 10, height: 2,
          background: "rgba(255,255,255,0.08)",
        }} />
        {phases.map((p, i) => {
          const lit = i <= activeIndex;
          return (
            <div key={p.year} style={{ textAlign: "center", zIndex: 1, flex: 1 }}>
              <motion.div
                animate={{ scale: i === activeIndex ? [1, 1.15, 1] : 1 }}
                transition={{ duration: 1.2, repeat: i === activeIndex ? Infinity : 0 }}
                style={{
                  width: 20, height: 20, borderRadius: "50%", margin: "0 auto 8px",
                  border: `2px solid ${lit ? "#F472B6" : "rgba(255,255,255,0.15)"}`,
                  background: lit ? "rgba(244,114,182,0.25)" : "rgba(0,0,0,0.4)",
                  boxShadow: i === activeIndex ? "0 0 16px rgba(244,114,182,0.45)" : undefined,
                }}
              />
              <div style={{ fontFamily: MONO, fontSize: "0.42rem", color: lit ? "#FBCFE8" : "rgba(255,255,255,0.35)", fontWeight: 700 }}>
                {p.year}
              </div>
              <div style={{ fontFamily: FONT, fontSize: "0.48rem", color: lit ? "#FDF2F8" : "rgba(255,255,255,0.4)", marginTop: 4, lineHeight: 1.3 }}>
                {p.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PolicyClaimsCard({
  claims,
  revealed,
}: {
  claims: { key: string; value: string; sensitive?: boolean }[];
  revealed: number;
}) {
  return (
    <div style={{
      width: "100%", maxWidth: 340, borderRadius: 10, overflow: "hidden",
      border: "1px solid rgba(148,163,184,0.3)",
      background: "linear-gradient(165deg, #12151a, #08090c)",
    }}>
      <div style={{
        padding: "8px 12px", borderBottom: "1px solid rgba(148,163,184,0.15)",
        fontFamily: MONO, fontSize: "0.38rem", color: "#94A3B8", letterSpacing: "0.08em",
      }}>
        POLICY OUTPUT · MINIMUM DISCLOSURE
      </div>
      <div style={{ padding: "10px 12px" }}>
        {claims.map((c, i) => (
          <div key={c.key} style={{
            display: "flex", justifyContent: "space-between", gap: 12,
            padding: "6px 0", borderBottom: i < claims.length - 1 ? "1px solid rgba(255,255,255,0.05)" : undefined,
            opacity: i < revealed ? 1 : 0.35,
          }}>
            <span style={{ fontFamily: MONO, fontSize: "0.36rem", color: "rgba(148,163,184,0.8)" }}>{c.key}</span>
            <span style={{
              fontFamily: MONO, fontSize: "0.36rem", fontWeight: 700,
              color: c.sensitive ? "rgba(255,255,255,0.2)" : "#E2E8F0",
              textDecoration: c.sensitive ? "line-through" : undefined,
            }}>
              {c.sensitive ? "████" : c.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
