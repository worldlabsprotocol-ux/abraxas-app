"use client";
// FILE: components/redesign/SupplyNetworkTeaser.tsx

import { SUPPLY_NETWORK } from "@/lib/supplyNetworkVision";
import { CapabilityStatusBadge } from "@/components/ui/CapabilityStatusBadge";
import { Btn } from "./ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export function SupplyNetworkTeaser() {
  return (
    <section aria-labelledby="supply-network-heading">
      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
          <div style={{
            fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700,
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: ACCENT,
          }}>
            Future vertical
          </div>
          <CapabilityStatusBadge status="planned" size="xs" />
        </div>
        <h2 id="supply-network-heading" style={{
          fontFamily: FONT, fontSize: "var(--fs-h1)", fontWeight: 800,
          letterSpacing: "-0.03em", lineHeight: 1.08,
          color: "var(--text-primary)", margin: "0 0 0.65rem",
        }}>
          {SUPPLY_NETWORK.headline}
        </h2>
        <p style={{
          fontFamily: FONT, fontSize: "0.85rem", color: "var(--text-secondary)",
          lineHeight: 1.7, maxWidth: 640, margin: "0 0 0.5rem",
        }}>
          {SUPPLY_NETWORK.subhead}
        </p>
        <p style={{
          fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)",
          lineHeight: 1.55, maxWidth: 640, margin: 0,
        }}>
          Enterprise supply-network vision — not a live product surface today. See dedicated page for scope.
        </p>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: "0.85rem",
        marginBottom: "1rem",
      }}>
        <div style={{
          padding: "1rem", borderRadius: 14,
          background: "var(--surface)", border: "1px solid var(--border)",
        }}>
          <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.65rem" }}>
            Verified supplier profile
          </div>
          <ul style={{ margin: 0, padding: "0 0 0 1rem", display: "grid", gap: "0.35rem" }}>
            {SUPPLY_NETWORK.supplierFields.map(f => (
              <li key={f} style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div style={{
          padding: "1rem", borderRadius: 14,
          background: "var(--surface)", border: "1px solid var(--border)",
        }}>
          <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.65rem" }}>
            Verified order lifecycle
          </div>
          <ol style={{ margin: 0, padding: "0 0 0 1.1rem", display: "grid", gap: "0.35rem" }}>
            {SUPPLY_NETWORK.orderLifecycle.map((step, i) => (
              <li key={step} style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                <span style={{ color: ACCENT, fontWeight: 700, marginRight: 4 }}>{i + 1}.</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>

      <p style={{
        fontFamily: FONT, fontSize: "0.82rem", fontWeight: 600,
        color: "var(--text-primary)", lineHeight: 1.6, margin: "0 0 0.85rem", maxWidth: 560,
      }}>
        {SUPPLY_NETWORK.valueProp}
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.85rem" }}>
        {SUPPLY_NETWORK.industries.map(ind => (
          <span key={ind} style={{
            padding: "0.35rem 0.75rem", borderRadius: 999,
            border: "1px solid var(--border)", background: "var(--surface-raised)",
            fontFamily: FONT, fontSize: "0.68rem", fontWeight: 600, color: "var(--text-secondary)",
          }}>
            {ind}
          </span>
        ))}
      </div>

      <Btn href="/solutions/supply-network" size="sm">Explore supply network vision →</Btn>
    </section>
  );
}
