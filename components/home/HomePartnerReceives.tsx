"use client";
// FILE: components/home/HomePartnerReceives.tsx
// What partners receive vs. what stays with the user.

import {
  HOME_PARTNER_RECEIVES_HEADLINE,
  HOME_PARTNER_RECEIVES_LEAD,
  HOME_PARTNER_RECEIVES_NOTE,
  PARTNER_DOES_NOT_RECEIVE_ITEMS,
  PARTNER_RECEIVES_ITEMS,
} from "@/lib/home/commercialHomeContent";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

function CompareColumn({
  title,
  items,
  variant,
}: {
  title: string;
  items: readonly string[];
  variant: "receives" | "withholds";
}) {
  return (
    <div className={`abx-home-compare-column abx-home-compare-column--${variant}`}>
      <h3
        style={{
          fontFamily: FONT,
          fontSize: "0.88rem",
          fontWeight: 800,
          color: "var(--text-primary)",
          margin: "0 0 0.65rem",
          letterSpacing: "-0.02em",
        }}
      >
        {title}
      </h3>
      <ul className="abx-home-compare-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function HomePartnerReceives() {
  return (
    <section
      aria-labelledby="home-partner-receives-heading"
      className="abx-home-section-center"
      style={{ width: "100%" }}
    >
      <div className="abx-home-intro">
        <h2
          id="home-partner-receives-heading"
          className="abx-home-section-title"
          style={{ fontFamily: FONT }}
        >
          {HOME_PARTNER_RECEIVES_HEADLINE}
        </h2>
        <p className="abx-home-section-lead">{HOME_PARTNER_RECEIVES_LEAD}</p>
      </div>
      <div className="abx-home-compare-grid">
        <CompareColumn title="Partner receives" items={PARTNER_RECEIVES_ITEMS} variant="receives" />
        <CompareColumn
          title="Partner does not automatically receive"
          items={PARTNER_DOES_NOT_RECEIVE_ITEMS}
          variant="withholds"
        />
      </div>
      <p
        style={{
          fontFamily: FONT,
          fontSize: "clamp(0.76rem, 1.8vw, 0.84rem)",
          fontWeight: 500,
          color: "var(--text-muted, var(--text-secondary))",
          lineHeight: 1.6,
          margin: "0.85rem auto 0",
          maxWidth: 680,
          opacity: 0.9,
        }}
      >
        {HOME_PARTNER_RECEIVES_NOTE}
      </p>
    </section>
  );
}
