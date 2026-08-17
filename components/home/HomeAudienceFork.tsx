"use client";
// FILE: components/home/HomeAudienceFork.tsx
// Holder, partner integrator, and operator-managed provisioning paths.

import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import {
  AUDIENCE_HOLDER,
  AUDIENCE_OPERATOR,
  AUDIENCE_PARTNER,
} from "@/lib/activation/activationCopy";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

const AUDIENCES = [AUDIENCE_HOLDER, AUDIENCE_PARTNER, AUDIENCE_OPERATOR] as const;

export function HomeAudienceFork() {
  return (
    <section aria-labelledby="home-audience-fork-heading" className="abx-home-section-center" style={{ width: "100%" }}>
      <h2
        id="home-audience-fork-heading"
        className="abx-home-section-title"
        style={{ marginBottom: "0.85rem", fontSize: "clamp(1rem, 2.5vw, 1.15rem)" }}
      >
        Choose your path
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
          gap: "0.75rem",
          maxWidth: 960,
          width: "100%",
        }}
      >
        {AUDIENCES.map((audience) => (
          <div
            key={audience.title}
            style={{
              padding: "1rem 1.1rem",
              borderRadius: 14,
              border: "1px solid var(--border-strong)",
              background: "var(--surface-raised)",
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", alignItems: "center" }}>
              <span style={{ fontFamily: FONT, fontSize: "0.9rem", fontWeight: 800, color: "var(--text-primary)" }}>
                {audience.title}
              </span>
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: "0.55rem",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  padding: "3px 8px",
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  color: "var(--text-muted)",
                }}
              >
                {audience.badge}
              </span>
            </div>
            <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0, flex: 1 }}>
              {audience.body}
            </p>
            {audience === AUDIENCE_HOLDER ? (
              <Btn href={audience.href} size="sm">
                {audience.cta}
              </Btn>
            ) : (
              <Link
                href={audience.href}
                style={{
                  fontFamily: FONT,
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  color: "var(--accent)",
                  textDecoration: "none",
                }}
              >
                {audience.cta} →
              </Link>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
