"use client";
// FILE: components/product/PrivacyDisclosureCard.tsx
// Requested / Shared / Withheld — core Abraxas privacy UX primitive.

import type { ReactNode } from "react";
import { ABX_FONT_SANS, ABX_FONT_MONO, ABX_SPACING } from "@/lib/design/abraxasDesignSystem";

const FONT = ABX_FONT_SANS;
const MONO = ABX_FONT_MONO;

export interface PrivacyDisclosureCardProps {
  requester?: string;
  requestReason?: string;
  requested: Array<{ label: string; detail?: string }>;
  shared: Array<{ label: string; detail?: string }>;
  withheld: Array<{ label: string }>;
  requestedTitle?: string;
  sharedTitle?: string;
  withheldTitle?: string;
  reuseMessage?: string | null;
  refreshRequired?: boolean;
  incompatible?: boolean;
  footer?: ReactNode;
  compact?: boolean;
}

export function PrivacyDisclosureCard({
  requester,
  requestReason,
  requested,
  shared,
  withheld,
  requestedTitle = "Requested",
  sharedTitle = "Shared",
  withheldTitle = "Withheld",
  reuseMessage,
  refreshRequired,
  incompatible,
  footer,
  compact = false,
}: PrivacyDisclosureCardProps) {
  const padding = compact ? "0.85rem 0.95rem" : "1rem 1.1rem";

  return (
    <div
      className="abx-privacy-disclosure"
      style={{
        borderRadius: ABX_SPACING.cardRadius,
        border: "1px solid var(--border-strong)",
        background: "var(--surface-raised)",
        padding,
      }}
    >
      {requester && (
        <header style={{ marginBottom: "0.75rem" }}>
          <p style={eyebrowStyle}>Who is asking</p>
          <p style={{ ...headingStyle, margin: "0.15rem 0 0" }}>{requester}</p>
          {requestReason && (
            <>
              <p style={{ ...eyebrowStyle, marginTop: "0.65rem" }}>Why</p>
              <p style={{ ...bodyStyle, margin: "0.15rem 0 0" }}>{requestReason}</p>
            </>
          )}
        </header>
      )}

      {reuseMessage && (
        <div style={noticeBox("success")} role="status">
          {reuseMessage}
        </div>
      )}
      {refreshRequired && (
        <div style={noticeBox("warning")} role="status">
          Your evidence needs to be refreshed before this request can be answered.
        </div>
      )}
      {incompatible && (
        <div style={noticeBox("warning")} role="status">
          This request requires different verified evidence.
        </div>
      )}

      <div
        style={{
          display: "grid",
          gap: "0.75rem",
          gridTemplateColumns: compact ? "1fr" : "repeat(auto-fit, minmax(180px, 1fr))",
        }}
      >
        <DisclosureColumn title={requestedTitle} items={requested} tone="neutral" />
        <DisclosureColumn title={sharedTitle} items={shared} tone="share" prefix="✓" />
        <DisclosureColumn title={withheldTitle} items={withheld} tone="withhold" prefix="✗" />
      </div>

      {footer}
    </div>
  );
}

function DisclosureColumn({
  title,
  items,
  tone,
  prefix,
}: {
  title: string;
  items: Array<{ label: string; detail?: string }>;
  tone: "neutral" | "share" | "withhold";
  prefix?: string;
}) {
  const color =
    tone === "share" ? "#10B981" : tone === "withhold" ? "var(--text-muted)" : "var(--text-secondary)";

  return (
    <div>
      <p style={{ ...eyebrowStyle, color }}>{title}</p>
      {items.length === 0 ? (
        <p style={{ ...bodyStyle, margin: "0.35rem 0 0", color: "var(--text-muted)" }}>None</p>
      ) : (
        <ul style={{ listStyle: "none", margin: "0.35rem 0 0", padding: 0, display: "grid", gap: "0.25rem" }}>
          {items.map((item) => (
            <li key={item.label} style={{ ...bodyStyle, margin: 0, color: "var(--text-primary)" }}>
              {prefix ? `${prefix} ` : ""}
              {item.label}
              {item.detail && (
                <span style={{ display: "block", fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 2 }}>
                  {item.detail}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function noticeBox(tone: "success" | "warning"): React.CSSProperties {
  const colors =
    tone === "success"
      ? { bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.35)", color: "#10B981" }
      : { bg: "rgba(244,162,97,0.1)", border: "rgba(244,162,97,0.35)", color: "#F4A261" };
  return {
    fontFamily: FONT,
    fontSize: "0.74rem",
    lineHeight: 1.55,
    padding: "0.55rem 0.7rem",
    borderRadius: 10,
    border: `1px solid ${colors.border}`,
    background: colors.bg,
    color: colors.color,
    marginBottom: "0.75rem",
  };
}

const eyebrowStyle: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: "0.55rem",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
  margin: 0,
};

const headingStyle: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.95rem",
  fontWeight: 800,
  color: "var(--text-primary)",
};

const bodyStyle: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.74rem",
  lineHeight: 1.55,
  color: "var(--text-secondary)",
};
