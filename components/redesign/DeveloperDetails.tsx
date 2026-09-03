"use client";
// FILE: components/redesign/DeveloperDetails.tsx
// Collapsible technical sections. crypto jargon hidden by default.

import { useState, type ReactNode } from "react";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

export function DeveloperDetails({
  title = "Technical details (for developers)",
  summary,
  children,
  defaultOpen = false,
}: {
  title?: string;
  summary?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{
      background: "var(--surface-raised)",
      border: "1px solid var(--border)",
      borderRadius: 16,
      marginBottom: "2rem",
      overflow: "hidden",
    }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-controls="developer-details-panel"
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          padding: "1rem 1.25rem",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div>
          <div style={{
            fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700,
            color: "var(--text-muted)", letterSpacing: "0.1em",
            textTransform: "uppercase", marginBottom: "0.25rem",
          }}>
            {title}
          </div>
          {summary && !open && (
            <div style={{
              fontFamily: FONT, fontSize: "0.78rem",
              color: "var(--text-secondary)", lineHeight: 1.55,
            }}>
              {summary}
            </div>
          )}
        </div>
        <span style={{
          fontFamily: MONO, fontSize: "0.65rem",
          color: "var(--text-muted)", flexShrink: 0,
        }}>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div id="developer-details-panel" style={{ padding: "0 1.25rem 1.25rem" }}>
          {children}
        </div>
      )}
    </div>
  );
}
