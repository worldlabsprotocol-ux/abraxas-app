"use client";
// FILE: components/passport/PassportVerifiedHero.tsx
// Verified-state hero — calm, trustworthy, action-oriented. No PII.

import { Btn } from "@/components/redesign/ui";
import { PartnerReturnCta } from "@/components/passport/PartnerReturnCta";
import {
  VERIFIED_HERO_HEADLINE,
  VERIFIED_HERO_SUPPORTING,
  VERIFIED_HERO_PRIVACY,
  buildVerifiedHeroPublicState,
} from "@/lib/passport/verifiedHero";
import type { PartnerFlowHandoffController } from "@/lib/passport/partnerFlowHandoff";
import { GOOD_TROUBLE_PILOT_LABEL } from "@/lib/goodTrouble/pilotExample";
import {
  HOLDER_VERIFIED_HERO_SECONDARY_CTA,
  HOLDER_VERIFY_CREDENTIAL_PATH,
} from "@/lib/integrate/partnerJourney";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

const CARD: React.CSSProperties = {
  background: "rgba(16,185,129,0.06)",
  border: "2px solid rgba(16,185,129,0.32)",
  borderRadius: 16,
  padding: "clamp(1.25rem, 3vw, 1.75rem)",
  marginBottom: "1.25rem",
};

interface Props {
  assuranceLevel: string;
  expiresAt?: string | null;
  handoff: PartnerFlowHandoffController;
}

export function PassportVerifiedHero({ assuranceLevel, expiresAt, handoff }: Props) {
  const state = buildVerifiedHeroPublicState({ assuranceLevel, expiresAt });

  return (
    <section style={CARD} aria-labelledby="passport-verified-heading">
      <h2
        id="passport-verified-heading"
        style={{
          fontFamily: FONT,
          fontSize: "clamp(1.35rem, 3.5vw, 1.65rem)",
          fontWeight: 800,
          color: "var(--text-primary)",
          margin: "0 0 0.5rem",
          letterSpacing: "-0.02em",
        }}
      >
        {VERIFIED_HERO_HEADLINE}
      </h2>
      <p style={{
        fontFamily: FONT,
        fontSize: "0.88rem",
        color: "var(--text-secondary)",
        lineHeight: 1.65,
        margin: "0 0 1rem",
        maxWidth: 560,
      }}>
        {VERIFIED_HERO_SUPPORTING}
      </p>

      <dl style={{
        display: "grid",
        gap: "0.5rem",
        margin: "0 0 1rem",
        padding: "0.85rem 1rem",
        borderRadius: 12,
        background: "var(--surface-inset)",
        border: "1px solid var(--border)",
      }}>
        {[
          ["Status", state.statusLabel],
          ["Assurance", state.assuranceLabel],
          ...(state.expirationLabel ? [["Valid through", state.expirationLabel.replace(/^Valid until /, "")]] : []),
        ].map(([label, value]) => (
          <div key={label} style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem 0.75rem" }}>
            <dt style={{
              fontFamily: FONT,
              fontSize: "0.72rem",
              fontWeight: 600,
              color: "var(--text-muted)",
              margin: 0,
              minWidth: "6.5rem",
            }}>
              {label}
            </dt>
            <dd style={{
              fontFamily: FONT,
              fontSize: "0.82rem",
              fontWeight: 700,
              color: label === "Status" ? ACCENT : "var(--text-primary)",
              margin: 0,
            }}>
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <p style={{
        fontFamily: FONT,
        fontSize: "0.78rem",
        color: "var(--text-secondary)",
        lineHeight: 1.65,
        margin: "0 0 1.15rem",
        maxWidth: 560,
      }}>
        {VERIFIED_HERO_PRIVACY}
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.85rem" }}>
        {handoff.isPartnerFlowContext ? (
          <PartnerReturnCta handoff={handoff} size="lg" label="Return to partner flow →" />
        ) : (
          <Btn href="/partners" size="lg">
            Explore compatible access →
          </Btn>
        )}
        <Btn href={HOLDER_VERIFY_CREDENTIAL_PATH} variant="secondary" size="lg">
          {HOLDER_VERIFIED_HERO_SECONDARY_CTA} →
        </Btn>
      </div>

      <p style={{
        fontFamily: FONT,
        fontSize: "0.68rem",
        color: "var(--text-muted)",
        lineHeight: 1.55,
        margin: 0,
      }}>
        Pilot example:{" "}
        <a
          href="/good-trouble"
          style={{ color: ACCENT, fontWeight: 600, textDecoration: "none" }}
        >
          Good Trouble checkout
        </a>
        {" "}— {GOOD_TROUBLE_PILOT_LABEL.toLowerCase()}
      </p>
    </section>
  );
}
