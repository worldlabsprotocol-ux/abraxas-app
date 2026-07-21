"use client";
// FILE: components/status/CurrentStatusModule.tsx
// Premium current-status module — proof first, gates second.

import Link from "next/link";
import {
  CURRENT_STATUS_IN_PROGRESS,
  CURRENT_STATUS_LIVE,
  CONFIDENT_STATUS_FRAMING,
  STATUS_STATE_COLOR,
  STATUS_STATE_LABEL,
  type CurrentStatusItem,
} from "@/lib/currentStatus";
import { mainnetReadinessProgress } from "@/lib/mainnetReadiness";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

type Variant = "compact" | "full";

export function CurrentStatusModule({
  variant = "full",
  id,
  showFraming = true,
}: {
  variant?: Variant;
  id?: string;
  showFraming?: boolean;
}) {
  const { done, total } = mainnetReadinessProgress();
  const progressPct = Math.round((done / total) * 100);

  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-heading` : undefined}
      className="abx-glass-panel"
      style={{
        padding: variant === "compact" ? "1rem 1.15rem" : "clamp(1.15rem, 3vw, 1.5rem)",
        borderRadius: 18,
        border: "1px solid var(--border-strong)",
        background: "linear-gradient(160deg, rgba(232,197,71,0.06) 0%, var(--surface-raised) 55%, rgba(10,8,20,0.4) 100%)",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", justifyContent: "space-between", alignItems: "flex-start", marginBottom: showFraming ? "0.85rem" : "0.65rem" }}>
        <div style={{ flex: "1 1 260px" }}>
          <div className="abx-eyebrow-violet" style={{ marginBottom: "0.35rem" }}>
            Current status · builder update
          </div>
          {id && (
            <h2
              id={`${id}-heading`}
              style={{
                fontFamily: FONT,
                fontSize: variant === "compact" ? "1rem" : "var(--fs-h2)",
                fontWeight: 800,
                letterSpacing: "-0.02em",
                color: "var(--text-primary)",
                margin: "0 0 0.45rem",
              }}
            >
              Live today — staged toward full mainnet
            </h2>
          )}
          {showFraming && (
            <p style={{ fontFamily: FONT, fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: 0, maxWidth: 620 }}>
              {CONFIDENT_STATUS_FRAMING}
            </p>
          )}
        </div>
        <ProgressBadge done={done} total={total} pct={progressPct} />
      </div>

      {variant === "full" && (
        <>
          <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.45rem" }}>
            What&apos;s working
          </div>
          <StatusGrid items={CURRENT_STATUS_LIVE} />
          <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "var(--text-primary)", margin: "1rem 0 0.45rem" }}>
            What we&apos;re closing next
          </div>
        </>
      )}
      <StatusGrid items={variant === "compact" ? CURRENT_STATUS_IN_PROGRESS : CURRENT_STATUS_IN_PROGRESS} compact={variant === "compact"} />

      {variant === "full" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", marginTop: "1rem", paddingTop: "0.85rem", borderTop: "1px solid var(--border)" }}>
          <Link href="/trust-framework#trust-over-time" style={{ fontFamily: FONT, fontSize: "0.76rem", fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>
            How trust stays current →
          </Link>
          <Link href="/roadmap#mainnet-readiness" style={{ fontFamily: FONT, fontSize: "0.76rem", fontWeight: 700, color: "var(--text-muted)", textDecoration: "none" }}>
            Full mainnet checklist →
          </Link>
        </div>
      )}
    </section>
  );
}

function ProgressBadge({ done, total, pct }: { done: number; total: number; pct: number }) {
  return (
    <div style={{ minWidth: 148, flexShrink: 0 }}>
      <div style={{ fontFamily: MONO, fontSize: "0.48rem", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 6 }}>
        MAINNET GATES · {done}/{total}
      </div>
      <div style={{ height: 6, borderRadius: 999, background: "var(--border)", overflow: "hidden", marginBottom: 6 }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg, var(--accent-deep, #C9A227), var(--accent-pale, #F5E6A8))" }} />
      </div>
      <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)" }}>
        Pilot production live · open mainnet sequencing
      </div>
    </div>
  );
}

function StatusGrid({ items, compact }: { items: CurrentStatusItem[]; compact?: boolean }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: compact ? "1fr" : "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
      gap: "0.45rem",
    }}>
      {items.map(item => (
        <StatusRow key={item.id} item={item} />
      ))}
    </div>
  );
}

function StatusRow({ item }: { item: CurrentStatusItem }) {
  const color = STATUS_STATE_COLOR[item.state];
  const inner = (
    <>
      <span style={{
        fontFamily: MONO, fontSize: "0.46rem", fontWeight: 700, letterSpacing: "0.08em",
        padding: "0.15rem 0.4rem", borderRadius: 999, flexShrink: 0, marginTop: 2,
        color, background: `${color}18`, border: `1px solid ${color}44`,
      }}>
        {STATUS_STATE_LABEL[item.state].toUpperCase()}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3 }}>
          {item.label}
        </div>
        <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", lineHeight: 1.5, marginTop: 2 }}>
          {item.detail}
        </div>
      </div>
    </>
  );

  const shellStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    gap: "0.55rem",
    alignItems: "start",
    padding: "0.65rem 0.75rem",
    borderRadius: 12,
    border: item.state === "live" ? "1px solid rgba(16,185,129,0.32)" : "1px solid var(--border)",
    background: item.state === "live" ? "var(--accent-verify-faint, rgba(16,185,129,0.05))" : "var(--surface)",
  };

  if (item.href) {
    return (
      <Link href={item.href} style={{ ...shellStyle, textDecoration: "none", color: "inherit" }}>
        {inner}
      </Link>
    );
  }
  return <div style={shellStyle}>{inner}</div>;
}
