"use client";
// FILE: components/holder/HolderTrustSurface.tsx
// Shared holder-facing status presentation (plain language + optional technical details).

import type { ReactNode } from "react";
import "./holderSurfaceMotion.css";

export function HolderTrustSurface(props: {
  eyebrow?: string;
  title: string;
  lead?: string;
  statusLabel?: string;
  statusTone?: "neutral" | "success" | "pending" | "error";
  children?: ReactNode;
  technicalDetails?: ReactNode;
}) {
  const tone = props.statusTone ?? "neutral";
  const toneColor =
    tone === "success" ? "var(--accent)"
      : tone === "pending" ? "#F59E0B"
        : tone === "error" ? "#EF4444"
          : "var(--text-muted)";

  return (
    <section
      className="abx-holder-trust-surface"
      style={{
        borderRadius: 16,
        border: "1px solid var(--border)",
        background: "var(--surface-raised)",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "1.1rem 1.2rem", borderBottom: "1px solid var(--border)" }}>
        {props.eyebrow ? (
          <div style={{
            fontSize: "0.62rem",
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: toneColor,
            marginBottom: 6,
          }}
          >
            {props.eyebrow}
          </div>
        ) : null}
        <h2 style={{
          fontSize: "1.15rem",
          fontWeight: 800,
          color: "var(--text-primary)",
          margin: "0 0 0.35rem",
          lineHeight: 1.25,
        }}
        >
          {props.title}
        </h2>
        {props.lead ? (
          <p style={{
            fontSize: "0.82rem",
            color: "var(--text-secondary)",
            lineHeight: 1.6,
            margin: 0,
          }}
          >
            {props.lead}
          </p>
        ) : null}
        {props.statusLabel ? (
          <p style={{
            marginTop: "0.65rem",
            marginBottom: 0,
            fontSize: "0.78rem",
            fontWeight: 600,
            color: toneColor,
          }}
          >
            {props.statusLabel}
          </p>
        ) : null}
      </div>
      {props.children ? (
        <div style={{ padding: "1rem 1.2rem 1.15rem" }}>{props.children}</div>
      ) : null}
      {props.technicalDetails ? (
        <details style={{
          borderTop: "1px solid var(--border)",
          padding: "0.65rem 1.2rem 0.85rem",
          fontSize: "0.72rem",
          color: "var(--text-muted)",
        }}
        >
          <summary style={{ cursor: "pointer", fontWeight: 600, color: "var(--text-secondary)" }}>
            Technical details
          </summary>
          <div style={{ marginTop: "0.5rem", lineHeight: 1.55 }}>{props.technicalDetails}</div>
        </details>
      ) : null}
    </section>
  );
}
