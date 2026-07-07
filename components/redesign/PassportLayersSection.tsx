"use client";
// FILE: components/redesign/PassportLayersSection.tsx
// Three-layer product model with honest Live / Pilot / Planned labels.

import Link from "next/link";
import {
  PASSPORT_LAYERS,
  PUBLIC_POSITIONING,
} from "@/lib/passportLayers";
import { ProductStatusBadge } from "@/components/ui/ProductStatusBadge";
import { Btn } from "./ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

const LAYER_ACCENT: Record<string, string> = {
  core: ACCENT,
  compliance: "#3B82F6",
  asset: "#F59E0B",
};

export function PassportLayersSection() {
  return (
    <section aria-labelledby="passport-layers-heading">
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{
          fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700,
          letterSpacing: "0.14em", textTransform: "uppercase",
          color: ACCENT, marginBottom: "0.5rem",
        }}>
          Portable proof network
        </div>
        <h2 id="passport-layers-heading" style={{
          fontFamily: FONT, fontSize: "var(--fs-h1)", fontWeight: 800,
          letterSpacing: "-0.03em", lineHeight: 1.08,
          color: "var(--text-primary)", margin: "0 0 0.65rem", maxWidth: 620,
        }}>
          {PUBLIC_POSITIONING.headline}
        </h2>
        <p style={{
          fontFamily: FONT, fontSize: "0.85rem", color: "var(--text-secondary)",
          lineHeight: 1.65, maxWidth: 640, margin: "0 0 0.5rem",
        }}>
          {PUBLIC_POSITIONING.subhead}
        </p>
        <p style={{
          fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)",
          lineHeight: 1.55, maxWidth: 640, margin: 0,
        }}>
          {PUBLIC_POSITIONING.proofNotDocuments}
        </p>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
        gap: "0.85rem",
        marginBottom: "1.15rem",
      }}>
        {PASSPORT_LAYERS.map(layer => {
          const accent = LAYER_ACCENT[layer.id] ?? ACCENT;
          return (
            <div
              key={layer.id}
              style={{
                borderRadius: 14,
                padding: "1.1rem 1.15rem",
                border: "1px solid var(--border-strong)",
                background: "var(--surface-raised)",
                borderTop: `3px solid ${accent}`,
                height: "100%",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.45rem", flexWrap: "wrap" }}>
                <span style={{
                  fontFamily: FONT, fontSize: "0.58rem", fontWeight: 700,
                  letterSpacing: "0.1em", textTransform: "uppercase",
                  color: accent,
                }}>
                  {layer.title}
                </span>
                <ProductStatusBadge status={layer.status} size="xs" />
              </div>
              <div style={{
                fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700,
                color: "var(--text-primary)", marginBottom: "0.35rem", lineHeight: 1.35,
              }}>
                {layer.tagline}
              </div>
              <p style={{
                fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)",
                lineHeight: 1.6, margin: "0 0 0.75rem",
              }}>
                {layer.summary}
              </p>
              <ul style={{
                margin: 0, paddingLeft: "1rem",
                fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)",
                lineHeight: 1.55,
              }}>
                {layer.capabilities.slice(0, 4).map(c => (
                  <li key={c} style={{ marginBottom: 4 }}>{c}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div style={{
        padding: "0.85rem 1rem", borderRadius: 12,
        background: "var(--surface)", border: "1px solid var(--border)",
        marginBottom: "1rem",
      }}>
        <p style={{
          fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)",
          lineHeight: 1.6, margin: 0,
        }}>
          {PUBLIC_POSITIONING.disclaimer}
        </p>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <Btn href="/passport" size="sm">Open Passport →</Btn>
        <Btn href="/integrations" variant="secondary" size="sm">Partner verifier API</Btn>
        <Link href="/docs/passport-spec" style={{
          fontFamily: FONT, fontSize: "0.76rem", fontWeight: 600,
          color: ACCENT, alignSelf: "center", textDecoration: "none",
        }}>
          Credential schema →
        </Link>
      </div>
    </section>
  );
}
