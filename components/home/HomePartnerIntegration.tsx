"use client";
// FILE: components/home/HomePartnerIntegration.tsx
// Neutral partner-integration demonstration — no cannabis lifestyle branding.

import Image from "next/image";
import {
  HOME_PARTNER_INTEGRATION_HEADLINE,
  HOME_PARTNER_INTEGRATION_LEAD,
} from "@/lib/home/commercialHomeContent";
import {
  HOMEPAGE_PARTNER_INTEGRATION_CARDS,
  partnerNetworkStatusEmoji,
  partnerNetworkStatusLabel,
} from "@/lib/home/partnerNetwork";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

export function HomePartnerIntegration() {
  const integration = HOMEPAGE_PARTNER_INTEGRATION_CARDS[0];

  return (
    <section
      aria-labelledby="home-partner-integration-heading"
      id="partner-integration"
      className="abx-home-section-center abx-partner-network"
      style={{ width: "100%" }}
    >
      <div className="abx-home-intro">
        <div className="abx-eyebrow-violet" style={{ marginBottom: "0.5rem" }}>
          Partner integration
        </div>
        <h2 id="home-partner-integration-heading" className="abx-home-section-title" style={{ fontFamily: FONT }}>
          {HOME_PARTNER_INTEGRATION_HEADLINE}
        </h2>
        <p className="abx-home-section-lead">{HOME_PARTNER_INTEGRATION_LEAD}</p>
      </div>

      <div className="abx-home-integration-demo">
        <div className="abx-home-integration-visual" aria-hidden="true">
          <Image src="/icon-48.png" alt="" width={48} height={48} />
          <div className="abx-home-integration-flow">
            <span>Passport</span>
            <span aria-hidden="true">→</span>
            <span>Policy check</span>
            <span aria-hidden="true">→</span>
            <span>Signed receipt</span>
          </div>
        </div>

        {integration ? (
          <article className="abx-home-integration-card">
            <span className="abx-partner-network-badge abx-partner-network-badge--design">
              <span aria-hidden="true">{partnerNetworkStatusEmoji(integration.status)}</span>
              {partnerNetworkStatusLabel(integration.status)}
            </span>
            <h3
              style={{
                fontFamily: FONT,
                fontSize: "0.95rem",
                fontWeight: 800,
                color: "var(--text-primary)",
                margin: "0.65rem 0 0.35rem",
              }}
            >
              {integration.name}
            </h3>
            <p
              style={{
                fontFamily: FONT,
                fontSize: "0.78rem",
                color: "var(--text-secondary)",
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              {integration.description}
            </p>
          </article>
        ) : null}
      </div>
    </section>
  );
}
