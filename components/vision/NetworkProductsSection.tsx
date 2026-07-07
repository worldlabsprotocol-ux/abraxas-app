"use client";
// FILE: components/vision/NetworkProductsSection.tsx
// Three product layers: Passport · Trust Registry · Policy Engine

import Link from "next/link";
import { NETWORK_PRODUCTS } from "@/lib/abraxasNetwork";
import { ProductStatusBadge } from "@/components/ui/ProductStatusBadge";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

const PRODUCT_LINK: Record<string, string> = {
  passport: "/passport",
  trust_registry: "/integrations#trust-registry",
  policy_engine: "/integrations#policy-engine",
};

export function NetworkProductsSection() {
  return (
    <section aria-labelledby="network-products-heading">
      <div style={{ marginBottom: "1.15rem" }}>
        <div style={{
          fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700,
          letterSpacing: "0.1em", textTransform: "uppercase",
          color: ACCENT, marginBottom: "0.45rem",
        }}>
          Three connected layers
        </div>
        <h2 id="network-products-heading" style={{
          fontFamily: FONT, fontSize: "var(--fs-h2)", fontWeight: 800,
          letterSpacing: "-0.02em", lineHeight: 1.15,
          color: "var(--text-primary)", margin: "0 0 0.45rem", maxWidth: 620,
        }}>
          Policy-controlled credential network
        </h2>
        <p style={{
          fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)",
          lineHeight: 1.6, maxWidth: 640, margin: 0,
        }}>
          Not a KYC vendor — a portable eligibility network. Partners buy an auditable decision,
          not a document upload form.
        </p>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
        gap: "0.85rem",
      }}>
        {NETWORK_PRODUCTS.map(product => (
          <Link key={product.id} href={PRODUCT_LINK[product.id] ?? "/integrations"} style={{ textDecoration: "none", color: "inherit" }}>
            <div style={{
              height: "100%", borderRadius: 14, padding: "1.05rem 1.1rem",
              border: "1px solid var(--border-strong)",
              background: "var(--surface-raised)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap", marginBottom: "0.4rem" }}>
                <span style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, color: "var(--text-primary)" }}>
                  {product.title}
                </span>
                <ProductStatusBadge status={product.status} size="xs" />
              </div>
              <p style={{
                fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)",
                lineHeight: 1.55, margin: "0 0 0.55rem",
              }}>
                {product.tagline}
              </p>
              <ul style={{ margin: 0, paddingLeft: "1rem" }}>
                {product.capabilities.slice(0, 4).map(cap => (
                  <li key={cap} style={{
                    fontFamily: FONT, fontSize: "0.66rem", color: "var(--text-muted)",
                    lineHeight: 1.5, marginBottom: 3,
                  }}>
                    {cap}
                  </li>
                ))}
              </ul>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
