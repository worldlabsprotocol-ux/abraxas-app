"use client";
// FILE: components/vision/TrustFrameworkSection.tsx
// Institutional trust framework. decision domains + operating model.

import { CLAIM_STACK, TRUST_FRAMEWORK_DOMAINS, TRUST_FRAMEWORK_OPERATING_MODEL } from "@/lib/abraxasNetwork";
import { ProductStatusBadge } from "@/components/ui/ProductStatusBadge";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export function TrustFrameworkSection() {
  return (
    <div>
      <section aria-labelledby="trust-domains-heading" style={{ marginBottom: "2.5rem" }}>
        <div style={{
          fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700,
          letterSpacing: "0.1em", textTransform: "uppercase",
          color: ACCENT, marginBottom: "0.45rem",
        }}>
          Decision domains
        </div>
        <h2 id="trust-domains-heading" style={{
          fontFamily: FONT, fontSize: "var(--fs-h2)", fontWeight: 800,
          letterSpacing: "-0.02em", lineHeight: 1.15,
          color: "var(--text-primary)", margin: "0 0 0.65rem", maxWidth: 640,
        }}>
          KYC is not one checkmark
        </h2>
        <p style={{
          fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)",
          lineHeight: 1.65, maxWidth: 680, margin: "0 0 1.25rem",
        }}>
          Each compliance question is an independent signed claim with its own issuer, assurance level, and expiry.
          A generic &ldquo;KYC verified&rdquo; badge must never imply all of these.
        </p>

        <div style={{ overflowX: "auto", borderRadius: 14, border: "1px solid var(--border-strong)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
            <thead>
              <tr style={{ background: "var(--surface-raised)" }}>
                {["Decision domain", "Example claims", "Who issues it", "Status"].map(h => (
                  <th key={h} style={{
                    fontFamily: MONO, fontSize: "0.52rem", fontWeight: 700,
                    letterSpacing: "0.06em", textTransform: "uppercase",
                    color: "var(--text-muted)", textAlign: "left",
                    padding: "0.75rem 0.85rem", borderBottom: "1px solid var(--border)",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TRUST_FRAMEWORK_DOMAINS.map(row => (
                <tr key={row.domain}>
                  <td style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)", padding: "0.75rem 0.85rem", borderBottom: "1px solid var(--border)" }}>
                    {row.domain}
                  </td>
                  <td style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", padding: "0.75rem 0.85rem", borderBottom: "1px solid var(--border)" }}>
                    {row.exampleClaims}
                  </td>
                  <td style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", padding: "0.75rem 0.85rem", borderBottom: "1px solid var(--border)" }}>
                    {row.issuers}
                  </td>
                  <td style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", padding: "0.75rem 0.85rem", borderBottom: "1px solid var(--border)" }}>
                    {row.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="claim-detail-heading" style={{ marginBottom: "2rem" }}>
        <h3 id="claim-detail-heading" style={{
          fontFamily: FONT, fontSize: "1rem", fontWeight: 800,
          color: "var(--text-primary)", margin: "0 0 1rem",
        }}>
          Claim reference
        </h3>
        <div style={{ display: "grid", gap: "0.4rem" }}>
          {CLAIM_STACK.map(entry => (
            <div key={entry.claim_type} style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr auto",
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
              <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                {entry.issuer_types.join(" · ")} · TTL {entry.typical_ttl}
              </div>
              <ProductStatusBadge status={entry.status} size="xs" />
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="operating-model-heading">
        <h3 id="operating-model-heading" style={{
          fontFamily: FONT, fontSize: "1rem", fontWeight: 800,
          color: "var(--text-primary)", margin: "0 0 0.65rem",
        }}>
          Operating model
        </h3>
        <p style={{
          fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)",
          lineHeight: 1.7, maxWidth: 720, margin: 0,
        }}>
          {TRUST_FRAMEWORK_OPERATING_MODEL}
        </p>
      </section>
    </div>
  );
}
