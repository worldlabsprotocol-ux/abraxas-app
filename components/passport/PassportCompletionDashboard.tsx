"use client";
// FILE: components/passport/PassportCompletionDashboard.tsx

import { computePassportCompletion, type PassportCompletionInput } from "@/lib/passportCompletion";
import { Skeleton } from "@/lib/motion/Skeleton";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";
const AMBER = "#F59E0B";

const STATUS_COLORS: Record<string, string> = {
  verified: ACCENT,
  pending: AMBER,
  optional: "var(--text-muted)",
  not_started: "var(--text-muted)",
};

const STATUS_LABELS: Record<string, string> = {
  verified: "Verified",
  pending: "Pending",
  optional: "Optional",
  not_started: "Not started",
};

export function PassportCompletionDashboard({
  input,
  loading,
  onItemClick,
}: {
  input: PassportCompletionInput;
  loading?: boolean;
  onItemClick?: (step: 1 | 2 | 3 | 4) => void;
}) {
  const completion = computePassportCompletion(input);
  const coreItems = completion.items.filter(i => i.step);
  const extraItems = completion.items.filter(i => !i.step);

  if (loading && !input.walletDone) {
    return (
      <div style={{
        background: "var(--surface-raised)", border: "1px solid var(--border)",
        borderRadius: 16, padding: "1.25rem", marginBottom: "1.5rem",
      }}>
        <Skeleton width="40%" height={12} style={{ marginBottom: 12 }} />
        <Skeleton width="70%" height={20} style={{ marginBottom: 16 }} />
        <Skeleton width="100%" height={8} style={{ marginBottom: 16, borderRadius: 999 }} />
        <div style={{ display: "grid", gap: 8 }}>
          {[1, 2, 3, 4].map(n => <Skeleton key={n} width="100%" height={36} />)}
        </div>
      </div>
    );
  }

  return (
    <section
      aria-label="Passport completion dashboard"
      style={{
        background: "var(--surface-raised)",
        border: `1px solid ${completion.percent === 100 ? `${ACCENT}44` : "var(--border)"}`,
        borderRadius: 16,
        padding: "clamp(1rem, 3vw, 1.35rem)",
        marginBottom: "1.5rem",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700, color: ACCENT, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.35rem" }}>
            Passport dashboard
          </div>
          <div style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {completion.percent === 100 ? "Fully verified. ready to reuse" : completion.percent >= 25 ? "In progress" : "Get started"}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: MONO, fontSize: "1.75rem", fontWeight: 800, color: ACCENT, lineHeight: 1 }}>
            {completion.percent}%
          </div>
          <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)" }}>
            {completion.verifiedCount} verified · {completion.pendingCount} pending
          </div>
        </div>
      </div>

      <div
        role="progressbar"
        aria-valuenow={completion.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Passport completion"
        style={{ height: 8, borderRadius: 999, background: "var(--border)", marginBottom: "1.15rem", overflow: "hidden" }}
      >
        <div style={{
          height: "100%", width: `${completion.percent}%`, borderRadius: 999,
          background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT}bb)`,
          transition: "width 0.5s ease",
        }} />
      </div>

      <div style={{ display: "grid", gap: "0.5rem", marginBottom: extraItems.length ? "1rem" : 0 }}>
        {coreItems.map(item => {
          const clickable = Boolean(onItemClick && item.step);
          const Row = clickable ? "button" : "div";
          return (
            <Row
              key={item.id}
              type={clickable ? "button" : undefined}
              onClick={clickable ? () => onItemClick!(item.step!) : undefined}
              style={{
                display: "flex", alignItems: "center", gap: "0.65rem",
                padding: "0.65rem 0.75rem", borderRadius: 10,
                border: "1px solid var(--border)", background: "var(--surface)",
                textAlign: "left", width: "100%",
                cursor: clickable ? "pointer" : "default",
                minHeight: 44,
              }}
            >
              <span style={{
                width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                background: STATUS_COLORS[item.status],
                boxShadow: item.status === "pending" ? `0 0 0 3px ${AMBER}22` : undefined,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: FONT, fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)" }}>
                  {item.label}
                </div>
                <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", lineHeight: 1.45 }}>
                  {item.detail}
                </div>
              </div>
              <span style={{
                fontFamily: MONO, fontSize: "0.48rem", fontWeight: 700,
                letterSpacing: "0.06em", textTransform: "uppercase",
                color: STATUS_COLORS[item.status],
                flexShrink: 0,
              }}>
                {STATUS_LABELS[item.status]}
              </span>
            </Row>
          );
        })}
      </div>

      {extraItems.length > 0 && (
        <>
          <div style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.5rem", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Additional stamps
          </div>
          <div style={{ display: "grid", gap: "0.4rem" }}>
            {extraItems.map(item => (
              <div key={item.id} style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                padding: "0.5rem 0.65rem", borderRadius: 8,
                border: "1px dashed var(--border)", minHeight: 40,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLORS[item.status], flexShrink: 0 }} />
                <span style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", flex: 1 }}>{item.label}</span>
                <span style={{ fontFamily: FONT, fontSize: "0.65rem", color: "var(--text-muted)" }}>{STATUS_LABELS[item.status]}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
