"use client";
// FILE: components/redesign/IntegratorStrip.tsx
// Developer-facing API teaser — collapsed by default on the consumer homepage.

import { useState } from "react";
import { Btn } from "./ui";
import { consumerCopy } from "@/lib/consumerCopy";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

const ENDPOINTS = [
  { method: "GET", path: "/api/trust/status?sui=0x…", desc: "Wallet + ID status + credentials" },
  { method: "POST", path: "/api/intent/verify", desc: "Account control proof" },
  { method: "GET", path: "/api/sui/passport?sui=0x…", desc: "Verification stamp status" },
];

export function IntegratorStrip() {
  const [showApi, setShowApi] = useState(false);

  return (
    <section>
      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{ fontFamily: MONO, fontSize: "0.62rem", fontWeight: 700, color: ACCENT,
                       letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
          {consumerCopy.integrator.eyebrow}
        </div>
        <h2 style={{ fontFamily: FONT, fontSize: "var(--fs-h1)", fontWeight: 800,
                       letterSpacing: "-0.03em", lineHeight: 1.05, color: "var(--text-primary)",
                       margin: "0 0 0.5rem", maxWidth: 560 }}>
          {consumerCopy.integrator.title}
        </h2>
        <p style={{ fontFamily: FONT, fontSize: "var(--fs-body)", color: "var(--text-secondary)",
                     lineHeight: 1.7, maxWidth: 620, margin: 0 }}>
          {consumerCopy.integrator.body}
        </p>
      </div>

      <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <Btn href="/docs/ail" size="sm">{consumerCopy.integrator.cta}</Btn>
        <button
          type="button"
          onClick={() => setShowApi(v => !v)}
          style={{
            padding: "0.45rem 0.85rem", borderRadius: 999,
            border: "1px solid var(--border)", background: "var(--surface)",
            fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
            color: "var(--text-secondary)", cursor: "pointer",
          }}
        >
          {showApi ? "Hide API endpoints ▲" : "View API endpoints ▼"}
        </button>
      </div>

      {showApi && (
        <div style={{
          borderRadius: 16, overflow: "hidden",
          border: "1px solid var(--border-strong)",
          background: "var(--surface-raised)",
        }}>
          {ENDPOINTS.map((ep, i) => (
            <div key={ep.path} style={{
              display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.75rem",
              alignItems: "center", padding: "0.85rem 1rem",
              borderBottom: i < ENDPOINTS.length - 1 ? "1px solid var(--border)" : "none",
            }}>
              <span style={{ fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700, color: ACCENT,
                              padding: "0.15rem 0.4rem", borderRadius: 6, background: `${ACCENT}12` }}>
                {ep.method}
              </span>
              <div>
                <code style={{ fontFamily: MONO, fontSize: "0.72rem", color: "var(--text-primary)" }}>{ep.path}</code>
                <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 2 }}>
                  {ep.desc}
                </div>
              </div>
            </div>
          ))}
          <div style={{ padding: "0.85rem 1rem", display: "flex", gap: "0.625rem", flexWrap: "wrap" }}>
            <Btn href="/docs/sui" variant="secondary" size="sm">Sui integration hub</Btn>
            <Btn href="/docs/passport-spec" variant="ghost" size="sm">Passport spec</Btn>
          </div>
        </div>
      )}
    </section>
  );
}
