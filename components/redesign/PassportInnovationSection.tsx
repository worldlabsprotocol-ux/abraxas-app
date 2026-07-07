"use client";
// FILE: components/redesign/PassportInnovationSection.tsx

import { AddToAppleWalletButton } from "@/components/ui/AddToAppleWalletButton";
import { PASSPORT_LAYERS, PUBLIC_POSITIONING } from "@/lib/passportLayers";
import { ProductStatusBadge } from "@/components/ui/ProductStatusBadge";
import { Btn } from "./ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export function PassportInnovationSection() {
  return (
    <section style={{ paddingTop: "0.25rem" }}>
      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{
          fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700,
          letterSpacing: "0.14em", textTransform: "uppercase",
          color: ACCENT, marginBottom: "0.5rem",
        }}>
          Why Abraxas exists
        </div>
        <h2 style={{
          fontFamily: FONT, fontSize: "var(--fs-h1)", fontWeight: 800,
          letterSpacing: "-0.03em", lineHeight: 1.08,
          color: "var(--text-primary)", margin: "0 0 0.5rem", maxWidth: 560,
        }}>
          A portable proof layer — not another KYC upload form
        </h2>
        <p style={{
          fontFamily: FONT, fontSize: "0.85rem", color: "var(--text-secondary)",
          lineHeight: 1.65, maxWidth: 580, margin: 0,
        }}>
          {PUBLIC_POSITIONING.proofNotDocuments} Lenders and partners get policy decisions and audit trails — not folders of IDs.
        </p>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
        gap: "1.25rem",
      }}>
        <div style={{
          padding: "1.35rem", borderRadius: 16,
          border: "1px solid var(--border-strong)", background: "var(--surface-raised)",
        }}>
          {PASSPORT_LAYERS.map(layer => (
            <div key={layer.id} style={{ marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: 4, flexWrap: "wrap" }}>
                <span style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {layer.title}
                </span>
                <ProductStatusBadge status={layer.status} size="xs" />
              </div>
              <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
                {layer.tagline}
              </p>
            </div>
          ))}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem", alignItems: "center" }}>
            <AddToAppleWalletButton href="/passport#apple-wallet" variant="primary" size="sm">
              Add to Apple Wallet
            </AddToAppleWalletButton>
            <Btn href="/passport" variant="secondary" size="sm">Open Passport</Btn>
          </div>
        </div>

        <div style={{
          borderRadius: 16, overflow: "hidden",
          border: "1px solid var(--border-strong)",
          background: "var(--surface-raised)",
        }}>
          <div style={{ padding: "0.85rem 1rem", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: ACCENT }}>Issuer → Holder → Verifier</span>
          </div>
          <ol style={{
            margin: 0, padding: "1.15rem 1rem 1.15rem 1.4rem",
            fontFamily: FONT, fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.9,
          }}>
            <li><strong style={{ color: "var(--text-primary)" }}>Trusted provider</strong> verifies a specific claim</li>
            <li><strong style={{ color: "var(--text-primary)" }}>You hold</strong> the signed credential in Passport</li>
            <li><strong style={{ color: "var(--text-primary)" }}>Partner requests</strong> only what their policy needs</li>
            <li><strong style={{ color: "var(--text-primary)" }}>You consent</strong> to share selected claims</li>
            <li><strong style={{ color: "var(--text-primary)" }}>Partner gets</strong> approve / deny / review + audit trail</li>
          </ol>
        </div>
      </div>
    </section>
  );
}
