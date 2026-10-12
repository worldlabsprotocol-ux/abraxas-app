"use client";

import Link from "next/link";
import { AbxCard, AbxStatusBadge } from "@/components/design/AbxPrimitives";
import { ABX_FONT_SANS, ABX_TYPOGRAPHY } from "@/lib/design/abraxasDesignSystem";
import { PROTOCOL_INTEGRATIONS, STATUS_COLOR, STATUS_LABEL, type IntegrationStatus } from "@/lib/protocolIntegrations";

const FONT = ABX_FONT_SANS;

function statusTone(status: IntegrationStatus): "success" | "warning" | "pending" | "neutral" {
  switch (status) {
    case "live":
      return "success";
    case "pilot":
      return "warning";
    case "loi":
      return "pending";
    default:
      return "neutral";
  }
}

export function HomeIntegrationCatalog() {
  const visible = PROTOCOL_INTEGRATIONS.slice(0, 6);

  return (
    <section aria-labelledby="integration-catalog-heading" className="abx-institutional-section">
      <h2 id="integration-catalog-heading" className="abx-institutional-section__title">
        Supported integrations (honest status)
      </h2>
      <p className="abx-institutional-section__lead">
        Status labels reflect operational reality. not marketing tiers.
      </p>
      <div
        style={{
          display: "grid",
          gap: "0.65rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        }}
      >
        {visible.map((item) => (
          <AbxCard key={item.id} accent="developer" padding="1rem 1.05rem">
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "flex-start" }}>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: "0.9rem", color: "var(--text-primary)" }}>
                  {item.name}
                </div>
                <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>
                  {item.category}
                </div>
              </div>
              <AbxStatusBadge label={STATUS_LABEL[item.status]} tone={statusTone(item.status)} />
            </div>
            <p style={{ margin: "0.55rem 0 0", fontFamily: FONT, ...ABX_TYPOGRAPHY.small, color: "var(--text-secondary)" }}>
              {item.description}
            </p>
            {item.href ? (
              <Link
                href={item.href}
                style={{
                  display: "inline-block",
                  marginTop: "0.55rem",
                  fontFamily: FONT,
                  fontSize: ABX_TYPOGRAPHY.small.fontSize,
                  color: STATUS_COLOR[item.status],
                  textDecoration: "underline",
                  textUnderlineOffset: 3,
                }}
              >
                View integration →
              </Link>
            ) : null}
          </AbxCard>
        ))}
      </div>
      <Link
        href="/integrations"
        style={{
          display: "inline-block",
          marginTop: "0.85rem",
          fontFamily: FONT,
          fontSize: ABX_TYPOGRAPHY.body.fontSize,
          color: "var(--accent)",
          textDecoration: "underline",
          textUnderlineOffset: 3,
        }}
      >
        Open Integration Studio →
      </Link>
    </section>
  );
}
