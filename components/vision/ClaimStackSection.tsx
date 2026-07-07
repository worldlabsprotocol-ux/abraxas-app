"use client";
// FILE: components/vision/ClaimStackSection.tsx
// KYC is a stack of separate claims — not one green checkmark.

import { CLAIM_STACK, type ClaimLayer } from "@/lib/abraxasNetwork";
import { ProductStatusBadge } from "@/components/ui/ProductStatusBadge";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

const LAYER_LABEL: Record<ClaimLayer, string> = {
  identity: "Identity",
  wallet: "Wallet",
  investor: "Investor",
  business: "Business",
  asset: "Asset",
  transfer: "Transfer",
};

export function ClaimStackSection({ compact = false }: { compact?: boolean }) {
  const layers = Array.from(new Set(CLAIM_STACK.map(c => c.layer)));

  return (
    <section aria-labelledby="claim-stack-heading">
      <div style={{ marginBottom: "1rem" }}>
        <div style={{
          fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700,
          letterSpacing: "0.1em", textTransform: "uppercase",
          color: ACCENT, marginBottom: "0.45rem",
        }}>
          Claim stack
        </div>
        <h2 id="claim-stack-heading" style={{
          fontFamily: FONT, fontSize: compact ? "1rem" : "var(--fs-h2)",
          fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.15,
          color: "var(--text-primary)", margin: "0 0 0.45rem",
        }}>
          KYC is not one checkmark
        </h2>
        <p style={{
          fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)",
          lineHeight: 1.6, maxWidth: 640, margin: 0,
        }}>
          Each compliance question is an independent signed claim with its own issuer, assurance level, and expiry.
          A generic &ldquo;KYC verified&rdquo; badge must never imply all of these.
        </p>
      </div>

      <div style={{ display: "grid", gap: "0.85rem" }}>
        {layers.map(layer => (
          <div key={layer}>
            <div style={{
              fontFamily: MONO, fontSize: "0.52rem", fontWeight: 700,
              color: "var(--text-muted)", letterSpacing: "0.08em",
              textTransform: "uppercase", marginBottom: "0.4rem",
            }}>
              {LAYER_LABEL[layer]}
            </div>
            <div style={{ display: "grid", gap: "0.4rem" }}>
              {CLAIM_STACK.filter(c => c.layer === layer).map(entry => (
                <div key={entry.claim_type} style={{
                  display: "grid",
                  gridTemplateColumns: compact ? "1fr auto" : "1fr 1fr auto",
                  gap: "0.5rem", alignItems: "start",
                  padding: "0.55rem 0.65rem", borderRadius: 10,
                  background: "var(--surface)", border: "1px solid var(--border)",
                }}>
                  <div>
                    <div style={{ fontFamily: FONT, fontSize: "0.76rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {entry.question}
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: "0.5rem", color: "var(--text-muted)", marginTop: 2 }}>
                      {entry.claim_type}
                    </div>
                  </div>
                  {!compact && (
                    <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                      {entry.issuer_types.join(" · ")} · TTL {entry.typical_ttl}
                    </div>
                  )}
                  <ProductStatusBadge status={entry.status} size="xs" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
